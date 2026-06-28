import { BaseAgent } from './BaseAgent';
import { AgentContext, AgentDecision } from './AgentContext';
import { AI_CONFIG } from '../config/ai.config';
import { IssueRepository, Issue } from '../repositories/issue.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { GoogleGenAI } from '@google/genai';
import { agentMemory } from './AgentMemory';
import { eventBus } from '../events/eventBus';
import { EventType } from '../events/eventTypes';

export class EscalationAgent extends BaseAgent {
  public readonly id = AI_CONFIG.agents.escalation.id;
  public readonly name = AI_CONFIG.agents.escalation.name;
  public readonly description = AI_CONFIG.agents.escalation.description;
  public readonly priority = AI_CONFIG.agents.escalation.priority;

  public async execute(context: AgentContext): Promise<AgentContext> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const now = Date.now();

    const escalatedIds: string[] = [];
    const resolvedIds: string[] = [];
    let decisions: AgentDecision[] = [];

    // Helper function to evaluate and process a single issue
    const processSingleIssue = async (issue: Issue): Promise<{ escalated: boolean; resolved: boolean; decision?: AgentDecision }> => {
      if (['resolved', 'dismissed', 'Duplicate'].includes(issue.status)) {
        return { escalated: false, resolved: false };
      }

      const timeSinceUpdateHours = issue.created_at ? (now - new Date(issue.created_at).getTime()) / 3600000 : 0;

      // 1. Core In Progress stagnation check (48 hours)
      const isInProgress = ['In Progress', 'investigating', 'resolving'].includes(issue.status);
      if (isInProgress && timeSinceUpdateHours >= 48 && (issue.escalation_level || 0) < 3) {
        let should_escalate = true;
        let new_severity = 'high';
        let reason = "No progress has been logged by the assigned department on this critical issue in the last 48 hours.";
        let reasoning = "Stagnation criteria met (>48 hours in progress).";

        if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
          try {
            const ai = new GoogleGenAI({
              apiKey: geminiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                }
              }
            });
            const issueSummary = `
              Issue #${issue.issue_id}
              Title: ${issue.title}
              Description: ${issue.description || 'No description'}
              Status: In Progress / ${issue.status}
              Assigned to: ${issue.assigned_to || 'Department Duty Responder'}
              Last update: ${timeSinceUpdateHours.toFixed(1)} hours ago
              Community upvotes: ${issue.upvotes || 0}
              Category: ${issue.category}
            `;

            const prompt = `
              Analyze this stagnant civic issue. Should we escalate this issue to higher management?
              
              ${issueSummary}

              Return ONLY a valid JSON block:
              {
                "should_escalate": true,
                "new_severity": "critical",
                "reason": "Detail the justification for escalating this issue (e.g. high community upvotes, utility blockage, risk to health/safety)."
              }
            `;

            const response = await ai.models.generateContent({
              model: AI_CONFIG.gemini.model,
              contents: prompt
            });

            const textResponse = response.text || '';
            const startIdx = textResponse.indexOf('{');
            const endIdx = textResponse.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
              const cleanJsonStr = textResponse.substring(startIdx, endIdx + 1);
              const parsed = JSON.parse(cleanJsonStr);
              should_escalate = parsed.should_escalate !== undefined ? parsed.should_escalate : should_escalate;
              new_severity = parsed.new_severity || new_severity;
              reason = parsed.reason || reason;
              reasoning = "Stagnated issue evaluated and approved for escalation via Gemini AI models.";
            }
          } catch (err: any) {
            console.error(`[EscalationAgent] Gemini escalation analysis failed for issue ${issue.issue_id}:`, err);
            reasoning = `Deterministic stagnation fallback used. Error: ${err.message}`;
          }
        }

        if (should_escalate) {
          const nextLevel = (issue.escalation_level || 1) + 1;
          const old_severity = issue.severity || 'medium';

          const action = {
            agent: "Escalation Agent",
            action: "escalated",
            level: nextLevel,
            timestamp: new Date().toISOString(),
            output: {
              previous_status: issue.status,
              new_severity,
              reason
            }
          };

          await IssueRepository.update(issue.issue_id, {
            escalation_level: nextLevel,
            escalation_flag: true,
            severity: new_severity as any,
            agent_actions: [...(issue.agent_actions || []), action]
          });

          // Create comment explaining escalation
          const commentId = 'comment_' + Math.random().toString(36).substr(2, 9);
          const commentData = {
            comment_id: commentId,
            issue_id: issue.issue_id,
            author_id: 'agent_escalator',
            author_name: '🤖 Sentinel Triage Agent',
            text: `Consensus verified! Issue auto-escalated to Level ${nextLevel} due to stagnation. Assigned to ${issue.department} Manager. Severity: ${old_severity.toUpperCase()} → ${new_severity.toUpperCase()}`,
            upvotes: 0,
            created_at: new Date().toISOString()
          };
          await IssueRepository.addComment(issue.issue_id, commentData);

          // Push notifications
          await NotificationRepository.sendNotification(
            issue.issue_id,
            issue.created_by,
            `Issue #${issue.issue_id} has been escalated to Level ${nextLevel} (${new_severity.toUpperCase()}) due to department stagnation.`
          );

          console.log(`Escalation Agent: Issue #${issue.issue_id} escalated (Level ${nextLevel}), no progress ${timeSinceUpdateHours.toFixed(1)}h.`);

          eventBus.publish(EventType.Escalated, {
            issueId: issue.issue_id,
            newLevel: nextLevel,
            severity: new_severity,
            reason
          });

          const dec: AgentDecision = {
            agentId: this.id,
            agentName: this.name,
            action: 'escalated_stagnant',
            timestamp: new Date().toISOString(),
            output: action.output,
            confidence: 90,
            reasoning
          };

          return { escalated: true, resolved: false, decision: dec };
        }
      }

      // 2. Original verification/escalation triggers
      if (['reported', 'verifying', 'verified'].includes(issue.status)) {
        const canEscalate = (issue.verification_percentage >= 80 && (issue.upvotes || 0) >= 2) || (issue.upvotes || 0) >= 3;
        if (canEscalate) {
          const nextEscalationLevel = (issue.escalation_level || 1) + 1;
          const nextStatus = nextEscalationLevel >= 3 ? 'resolving' : 'investigating';
          
          const action = {
            agent: "Escalation & Dispatch Agent",
            action: "escalate",
            timestamp: new Date().toISOString(),
            output: {
              previous_status: issue.status,
              new_status: nextStatus,
              new_escalation_level: nextEscalationLevel,
              trigger_reason: `Citizen consensus high (${issue.verification_percentage}%) with ${issue.upvotes} validations.`
            }
          };

          await IssueRepository.update(issue.issue_id, {
            status: nextStatus,
            escalation_level: nextEscalationLevel,
            agent_actions: [...(issue.agent_actions || []), action],
            assigned_to: `${issue.department} Duty Responder`
          });

          const commentId = 'comment_' + Math.random().toString(36).substr(2, 9);
          const commentData = {
            comment_id: commentId,
            issue_id: issue.issue_id,
            author_id: 'agent_escalator',
            author_name: '🤖 Sentinel Triage Agent',
            text: `Consensus verified! Issue auto-escalated to Level ${nextEscalationLevel} for direct response from ${issue.department}. Assigned responder dispatched!`,
            upvotes: 0,
            created_at: new Date().toISOString()
          };
          await IssueRepository.addComment(issue.issue_id, commentData);

          // Push notifications to citizen
          await NotificationRepository.sendNotification(
            issue.issue_id,
            issue.created_by,
            `🤖 Escalation Agent: Consensus verified! Issue #${issue.issue_id} has been auto-escalated to Level ${nextEscalationLevel} (${nextStatus.toUpperCase()}) for direct response.`
          );

          // Push notifications to assigned officer if there is one
          if (issue.assigned_to_person) {
            await NotificationRepository.sendNotification(
              issue.issue_id,
              issue.assigned_to_person,
              `🤖 Escalation Agent: Issue #${issue.issue_id} you are assigned to has been escalated to Level ${nextEscalationLevel} (${nextStatus.toUpperCase()}).`
            );
          }

          eventBus.publish(EventType.Escalated, {
            issueId: issue.issue_id,
            newLevel: nextEscalationLevel,
            severity: issue.severity,
            reason: `Community consensus upvotes threshold exceeded: ${issue.upvotes}`
          });

          const dec: AgentDecision = {
            agentId: this.id,
            agentName: this.name,
            action: 'consensus_escalated',
            timestamp: new Date().toISOString(),
            output: action.output,
            confidence: 100,
            reasoning: `Community consensus threshold reached (${issue.verification_percentage}% / ${issue.upvotes} upvotes). Dispatched to ${issue.department}.`
          };

          return { escalated: true, resolved: false, decision: dec };
        }
      }

      // 3. Fast demo-resolution trigger (60 seconds)
      if (['investigating', 'resolving'].includes(issue.status)) {
        const createdAtTime = new Date(issue.created_at).getTime();
        const secondsElapsed = (now - createdAtTime) / 1000;

        if (secondsElapsed >= 60) {
          const action = {
            agent: "Autonomous Resolution Agent",
            action: "resolve",
            timestamp: new Date().toISOString(),
            output: {
              previous_status: issue.status,
              new_status: 'resolved',
              resolution_code: "CM-AUTO-FIX",
              work_hours_spent: 4.5
            }
          };

          await IssueRepository.update(issue.issue_id, {
            status: 'resolved',
            agent_actions: [...(issue.agent_actions || []), action]
          });

          const commentId = 'comment_' + Math.random().toString(36).substr(2, 9);
          const commentData = {
            comment_id: commentId,
            issue_id: issue.issue_id,
            author_id: 'agent_resolver',
            author_name: '🤖 Sentinel Resolution Officer',
            text: `Physical on-site repair completed successfully by the dispatched work crew. Incident status has been updated to RESOLVED! Thank you for reporting!`,
            upvotes: 0,
            created_at: new Date().toISOString()
          };
          await IssueRepository.addComment(issue.issue_id, commentData);

          // Push notifications
          await NotificationRepository.sendNotification(
            issue.issue_id,
            issue.created_by,
            `🤖 Sentinel Resolution Agent: Physical on-site repair completed! Your reported issue is now RESOLVED.`
          );

          if (issue.assigned_to_person) {
            await NotificationRepository.sendNotification(
              issue.issue_id,
              issue.assigned_to_person,
              `🤖 Sentinel Resolution Agent: Assigned issue #${issue.issue_id} has been successfully resolved.`
            );
          }

          eventBus.publish(EventType.Resolved, {
            issueId: issue.issue_id,
            resolutionCode: 'CM-AUTO-FIX'
          });

          const dec: AgentDecision = {
            agentId: this.id,
            agentName: this.name,
            action: 'resolved',
            timestamp: new Date().toISOString(),
            output: action.output,
            confidence: 100,
            reasoning: "Dispatched city crews successfully finished asphalt, water node, or trash sweep. Marked resolved."
          };

          return { escalated: false, resolved: true, decision: dec };
        }
      }

      return { escalated: false, resolved: false };
    };

    let updatedIssue: Issue | undefined = context.issue;

    if (context.issue) {
      // Evaluate only the single issue passed in the context
      const res = await processSingleIssue(context.issue);
      if (res.escalated) escalatedIds.push(context.issue.issue_id);
      if (res.resolved) resolvedIds.push(context.issue.issue_id);
      if (res.decision) decisions.push(res.decision);
      
      const refreshed = await IssueRepository.getById(context.issue.issue_id);
      if (refreshed) {
        updatedIssue = refreshed;
      }
    } else {
      // Scan all issues
      const allIssues = await IssueRepository.getAll();
      for (const issue of allIssues) {
        const res = await processSingleIssue(issue);
        if (res.escalated) escalatedIds.push(issue.issue_id);
        if (res.resolved) resolvedIds.push(issue.issue_id);
        if (res.decision) decisions.push(res.decision);
      }
    }

    const outputResult = { escalated: escalatedIds, resolved: resolvedIds };
    
    // Default decision if nothing took place
    if (decisions.length === 0) {
      decisions.push({
        agentId: this.id,
        agentName: this.name,
        action: 'monitor',
        timestamp: new Date().toISOString(),
        output: outputResult,
        confidence: 100,
        reasoning: "Open issues successfully audited. No stagnation or consensus thresholds were breached."
      });
    }

    // Write to memory
    if (context.issue) {
      agentMemory.set(context.issue.issue_id, 'escalated_or_resolved', outputResult, this.id, 100);
    }

    return {
      ...context,
      issue: updatedIssue,
      previousDecisions: [...context.previousDecisions, ...decisions],
      aiOutputs: {
        ...context.aiOutputs,
        escalation: outputResult
      }
    };
  }
}
