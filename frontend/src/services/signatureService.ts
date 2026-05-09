import api from './api';
import type { Signature, SignatureCreateRequest, SignatureUpdateRequest } from '../types/signature';

const unwrap = <T,>(payload: any, fallback: T): T => payload?.data?.data ?? payload?.data ?? fallback;

export const signatureService = {
  async list(userId?: number): Promise<Signature[]> {
    const response = await api.get('/signatures', { params: userId ? { userId } : undefined });
    const data = unwrap<any>(response, []);
    return Array.isArray(data) ? data : [];
  },

  async getById(id: number, userId?: number): Promise<Signature> {
    const response = await api.get(`/signatures/${id}`, { params: userId ? { userId } : undefined });
    return unwrap<Signature>(response, {} as Signature);
  },

  async create(payload: SignatureCreateRequest, userId?: number): Promise<Signature> {
    const response = await api.post('/signatures', payload, { params: userId ? { userId } : undefined });
    return unwrap<Signature>(response, {} as Signature);
  },

  async update(id: number, payload: SignatureUpdateRequest, userId?: number): Promise<Signature> {
    const response = await api.put(`/signatures/${id}`, payload, { params: userId ? { userId } : undefined });
    return unwrap<Signature>(response, {} as Signature);
  },

  async remove(id: number, userId?: number): Promise<void> {
    await api.delete(`/signatures/${id}`, { params: userId ? { userId } : undefined });
  },

  async setDefault(id: number, userId?: number): Promise<Signature> {
    const response = await api.patch(`/signatures/${id}/default`, userId ? { userId } : {});
    return unwrap<Signature>(response, {} as Signature);
  },
};
