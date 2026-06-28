import { useState, useEffect } from 'react';
import { Comment } from '../types';
import { ApiService } from '../services/api.service';

export function useComments(issueId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComments = async () => {
    if (!issueId) return;
    try {
      setLoading(true);
      const data = await ApiService.getComments(issueId);
      setComments(data);
    } catch (err: any) {
      console.error("Failed to load comments:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [issueId]);

  const addComment = async (userId: string, authorName: string, text: string) => {
    try {
      const newComment = await ApiService.addComment(issueId, userId, authorName, text);
      // Optimistic update or reload
      setComments(prev => [newComment, ...prev]);
      return newComment;
    } catch (err: any) {
      console.error("Failed to add comment:", err);
      throw err;
    }
  };

  const upvoteComment = async (commentId: string) => {
    try {
      const upvotes = await ApiService.upvoteComment(issueId, commentId);
      setComments(prev => prev.map(c => c.comment_id === commentId ? { ...c, upvotes } : c));
    } catch (err: any) {
      console.error("Failed to upvote comment:", err);
      throw err;
    }
  };

  return { comments, loading, error, addComment, upvoteComment, reloadComments: loadComments };
}
