import { BaseAgent } from './BaseAgent';
import { AgentContext, AgentDecision } from './AgentContext';
import { AI_CONFIG } from '../config/ai.config';
import { IssueRepository } from '../repositories/issue.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { getCoordinatesDistanceMeters } from '../helpers';
import { agentMemory } from './AgentMemory';
import { eventBus } from '../events/eventBus';
import { EventType } from '../events/eventTypes';

export class DuplicateDetectionAgent extends BaseAgent {
  public readonly id = AI_CONFIG.agents.duplicate.id;
  public readonly name = AI_CONFIG.agents.duplicate.name;
  public readonly description = AI_CONFIG.agents.duplicate.description;
  public readonly priority = AI_CONFIG.agents.duplicate.priority;

  public async execute(context: AgentContext): Promise<AgentContext> {
    const issue = context.issue;
    if (!issue) {
      throw new Error(`[DuplicateDetectionAgent] Issue is missing in AgentContext`);
    }

    if (issue.status === 'Duplicate') {
      const decision: AgentDecision = {
        agentId: this.id,
        agentName: this.name,
        action: 'skip',
        timestamp: new Date().toISOString(),
        output: { is_duplicate: true, merged_into: issue.is_duplicate_of },
        confidence: 100,
        reasoning: `Issue is already flagged as a duplicate of #${issue.is_duplicate_of}.`
      };
      return {
        ...context,
        previousDecisions: [...context.previousDecisions, decision]
      };
    }

    const allIssues = await IssueRepository.getAll();

    // Strictly match department, category, and subcategory
    const candidates = allIssues.filter(other => 
      other.issue_id !== issue.issue_id &&
      other.status !== 'Duplicate' &&
      other.status !== 'resolved' &&
      other.category === issue.category &&
      (other.subcategory || '').toLowerCase() === (issue.subcategory || '').toLowerCase() &&
      other.department === issue.department
    );

    let bestMatch: any = null;
    let minDistance = Infinity;

    for (const other of candidates) {
      const dist = getCoordinatesDistanceMeters(
        issue.location.lat, issue.location.lng,
        other.location.lat, other.location.lng
      );

      // Must be same location (distance <= 100 meters)
      if (dist <= 100) {
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = other;
        }
      }
    }

    let isDuplicate = false;
    let mergedWithId = null;
    let reasoning = "Geospatial proximity search scan performed. No concurrent duplicate reports found.";
    let actionOutput: any = { is_duplicate: false, merged_with_issue_id: null, message: "No duplicates found nearby." };
    let updatedIssue = { ...issue };

    if (bestMatch) {
      isDuplicate = true;
      mergedWithId = bestMatch.issue_id;
      reasoning = `Incident merges into parent report #${bestMatch.issue_id} because of identical category/department and high geospatial proximity (${Math.round(minDistance)} meters away).`;
      actionOutput = {
        is_duplicate: true,
        merged_with_issue_id: bestMatch.issue_id,
        message: `We found an existing report nearby (Issue #${bestMatch.issue_id}). Your verification has been merged!`
      };

      const action = {
        agent: "Duplicate Detection Agent",
        action: "merge",
        timestamp: new Date().toISOString(),
        output: {
          is_duplicate: true,
          merged_into: bestMatch.issue_id,
          distance_meters: Math.round(minDistance)
        }
      };

      const updatedActions = [...(issue.agent_actions || []), action];
      
      await IssueRepository.update(issue.issue_id, {
        status: 'Duplicate',
        is_duplicate_of: bestMatch.issue_id,
        agent_actions: updatedActions
      });

      updatedIssue = {
        ...issue,
        status: 'Duplicate',
        is_duplicate_of: bestMatch.issue_id,
        agent_actions: updatedActions
      };

      // Update parent issue
      const newParentUpvotes = (bestMatch.upvotes || 0) + (issue.upvotes || 1);
      const parentDownvotes = bestMatch.downvotes || 0;
      const totalVotes = newParentUpvotes + parentDownvotes;
      const verification_percentage = totalVotes > 0 ? Math.round((newParentUpvotes / totalVotes) * 100) : 100;

      const parentAction = {
        agent: "Duplicate Detection Agent",
        action: "absorb",
        timestamp: new Date().toISOString(),
        output: {
          absorbed_issue_id: issue.issue_id,
          added_upvotes: issue.upvotes || 1
        }
      };

      await IssueRepository.update(bestMatch.issue_id, {
        upvotes: newParentUpvotes,
        verification_percentage,
        agent_actions: [...(bestMatch.agent_actions || []), parentAction]
      });

      // Add a comment to parent
      const commentId = 'comment_' + Math.random().toString(36).substr(2, 9);
      const commentData = {
        comment_id: commentId,
        issue_id: bestMatch.issue_id,
        author_id: 'agent_duplicate_detector',
        author_name: '🤖 Sentinel Duplicate Agent',
        text: `Duplicate report (Issue ID: #${issue.issue_id}) was automatically identified and merged into this master incident log. Consolidating citizen evidence!`,
        upvotes: 0,
        created_at: new Date().toISOString()
      };
      await IssueRepository.addComment(bestMatch.issue_id, commentData);

      // Send notifications
      // 1. Duplicate reporter
      await NotificationRepository.sendNotification(
        issue.issue_id,
        issue.created_by,
        `🤖 Duplicate Agent: Your report of "${issue.title}" matches master issue #${bestMatch.issue_id} in the same location, department, and category. Your verification has been merged.`
      );

      // 2. Parent reporter
      await NotificationRepository.sendNotification(
        bestMatch.issue_id,
        bestMatch.created_by,
        `🤖 Duplicate Agent: A duplicate report was identified nearby and successfully merged into your issue #${bestMatch.issue_id}. Verification percentage: ${verification_percentage}%.`
      );

      // 3. Officer if assigned
      if (bestMatch.assigned_to_person) {
        await NotificationRepository.sendNotification(
          bestMatch.issue_id,
          bestMatch.assigned_to_person,
          `🤖 Duplicate Agent: An additional duplicate report was merged into your assigned issue #${bestMatch.issue_id}.`
        );
      }

      console.log(`Duplicate Agent: Issue #${issue.issue_id} merged with #${bestMatch.issue_id} (distance=${Math.round(minDistance)}m)`);

      // Publish event
      eventBus.publish(EventType.DuplicateDetected, {
        issueId: issue.issue_id,
        duplicateOfIssueId: bestMatch.issue_id,
        distanceMeters: Math.round(minDistance)
      });
    } else {
      // If no duplicate is found, send a notification
      await NotificationRepository.sendNotification(
        issue.issue_id,
        issue.created_by,
        `🤖 Duplicate Agent: No duplicate reports found nearby for "${issue.title}". Checked matching category, subcategory, and department.`
      );
    }

    const decision: AgentDecision = {
      agentId: this.id,
      agentName: this.name,
      action: isDuplicate ? 'merge' : 'isolated',
      timestamp: new Date().toISOString(),
      output: actionOutput,
      confidence: 100,
      reasoning
    };

    // Save outputs in short term memory
    agentMemory.set(issue.issue_id, 'is_duplicate', isDuplicate, this.id, 100);
    if (isDuplicate) {
      agentMemory.set(issue.issue_id, 'merged_with_issue_id', mergedWithId, this.id, 100);
    }

    return {
      ...context,
      issue: updatedIssue,
      previousDecisions: [...context.previousDecisions, decision],
      aiOutputs: {
        ...context.aiOutputs,
        duplicate: actionOutput
      }
    };
  }
}
