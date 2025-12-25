import { pb } from '../pocketbase';
import type { Submission } from '@/types';
import { validateSubmissionStatus, validateRecordId } from '../validation';
import { sanitizeError } from '../error-handler';

export const submissionsApi = {
  // List submissions (admin only)
  async list(status?: 'pending' | 'approved' | 'rejected'): Promise<Submission[]> {
    let filter = '';
    if (status) {
      // Validate status against allowlist to prevent filter injection
      if (!validateSubmissionStatus(status)) {
        throw new Error('Invalid status parameter');
      }
      filter = `status = "${status}"`;
    }
    
    const result = await pb.collection('submissions').getList(1, 100, {
      filter,
      sort: '-submitted_at',
    });
    return result.items as unknown as Submission[];
  },

  // Get single submission
  async get(id: string): Promise<Submission> {
    // Validate ID format to prevent injection
    if (!validateRecordId(id)) {
      throw new Error('Invalid submission ID format');
    }
    return await pb.collection('submissions').getOne(id) as unknown as Submission;
  },

  // Create submission
  async create(data: Partial<Submission>): Promise<Submission> {
    return await pb.collection('submissions').create(data) as unknown as Submission;
  },

  // Update submission (approve/reject)
  async update(id: string, data: Partial<Submission>): Promise<Submission> {
    return await pb.collection('submissions').update(id, data) as unknown as Submission;
  },

  // Approve submission
  async approve(id: string, reviewedBy: string): Promise<Submission> {
    const submission = await this.get(id);
    
    // Whitelist of allowed fields for mosque creation/update
    // This prevents mass assignment attacks where malicious fields could be injected
    const ALLOWED_MOSQUE_FIELDS = [
      'name',
      'name_bm',
      'address',
      'state',
      'lat',
      'lng',
      'description',
      'description_bm',
      'image',
      'status',
    ] as const;
    
    // Sanitize submission data - only allow whitelisted fields
    const sanitizedData: Record<string, any> = {};
    for (const field of ALLOWED_MOSQUE_FIELDS) {
      if (field in submission.data && submission.data[field] !== undefined) {
        sanitizedData[field] = submission.data[field];
      }
    }
    
    // Force status to pending for new submissions (admin must approve separately)
    // For edits, preserve existing status unless explicitly changed
    if (submission.type === 'new_mosque') {
      sanitizedData.status = 'pending';
      sanitizedData.created_by = submission.submitted_by;
    }
    
    if (submission.type === 'new_mosque') {
      // Create the mosque with sanitized data
      await pb.collection('mosques').create(sanitizedData);
    } else if (submission.type === 'edit_mosque' && submission.mosque_id) {
      // Validate mosque ID format
      if (!validateRecordId(submission.mosque_id)) {
        throw new Error('Invalid mosque ID format');
      }
      // Update the mosque with sanitized data (only allowed fields)
      await pb.collection('mosques').update(submission.mosque_id, sanitizedData);
    }
    
    // Update submission status
    return await this.update(id, {
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    });
  },

  // Reject submission
  async reject(id: string, reviewedBy: string, reason: string): Promise<Submission> {
    return await this.update(id, {
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    });
  },
};

