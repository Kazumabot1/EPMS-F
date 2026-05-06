// khn (chatgpt)

//oneOnOneService.ts file:
// import api from './api';
//
// export interface Meeting {
//   id: number;
//   employeeId: number;
//   employeeFirstName: string;
//   employeeLastName: string;
//   managerId: number;
//   managerFirstName: string;
//   managerLastName: string;
//   scheduledDate: string;
//   notes: string | null;
//   followUpNotes?: string | null;
//   status: boolean;
//   followUpDate: string | null;
//   isFinalized: string | null;
//   createdAt: string;
//   updatedAt?: string | null;
//   parentMeetingId: number | null;
//   followUp: boolean;
//   actionItem: ActionItem | null;
// }
//
// export interface ActionItem {
//   id: number;
//   meetingId: number;
//   description: string;
//   updatedAt: string;
// }
//
// export interface CreateMeetingPayload {
//   employeeId: number;
//   scheduledDate: string;
//   notes: string;
//   parentMeetingId?: number | null;
//   followUpNotes?: string | null;
// }
//
// export interface UpdateMeetingPayload {
//   employeeId?: number;
//   scheduledDate: string;
//   notes: string;
//   parentMeetingId?: number | null;
//   followUpNotes?: string | null;
// }
//
// export interface SaveActionItemPayload {
//   meetingId: number;
//   description: string;
// }
//
// export interface FollowUpPayload {
//   followUpDate: string;
// }
//
// export interface EmployeeOption {
//   id: number;
//   firstName: string;
//   lastName: string;
// }
//
// type ApiResponse<T> = { data: T; message: string; success: boolean };
//
// const unwrapData = <T>(payload: any, fallback: T): T => {
//   if (payload?.data !== undefined) return payload.data as T;
//   if (payload !== undefined) return payload as T;
//   return fallback;
// };
//
// export const createMeeting = async (payload: CreateMeetingPayload): Promise<Meeting> => {
//   const res = await api.post<ApiResponse<Meeting>>('/one-on-one-meetings', payload);
//   return unwrapData<Meeting>(res.data, {} as Meeting);
// };
//
// export const updateMeeting = async (
//   id: number,
//   payload: UpdateMeetingPayload
// ): Promise<Meeting> => {
//   const res = await api.put<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}`, payload);
//   return unwrapData<Meeting>(res.data, {} as Meeting);
// };
//
// export const deleteMeeting = async (id: number): Promise<void> => {
//   await api.delete(`/one-on-one-meetings/${id}`);
// };
//
// export const getUpcomingMeetings = async (): Promise<Meeting[]> => {
//   const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/upcoming');
//   return Array.isArray(res.data?.data) ? res.data.data : [];
// };
//
// export const getOngoingMeetings = async (): Promise<Meeting[]> => {
//   const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/ongoing');
//   return Array.isArray(res.data?.data) ? res.data.data : [];
// };
//
// export const getPastMeetings = async (): Promise<Meeting[]> => {
//   const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/past');
//   return Array.isArray(res.data?.data) ? res.data.data : [];
// };
//
// export const getMeetingById = async (id: number): Promise<Meeting> => {
//   const res = await api.get<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}`);
//   return unwrapData<Meeting>(res.data, {} as Meeting);
// };
//
// export const finishMeeting = async (id: number): Promise<Meeting> => {
//   const res = await api.post<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}/finish`);
//   return unwrapData<Meeting>(res.data, {} as Meeting);
// };
//
// export const setFollowUp = async (id: number, payload: FollowUpPayload): Promise<Meeting> => {
//   const res = await api.put<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}/follow-up`, payload);
//   return unwrapData<Meeting>(res.data, {} as Meeting);
// };
//
// export const saveActionItem = async (payload: SaveActionItemPayload): Promise<ActionItem> => {
//   const res = await api.post<ApiResponse<ActionItem>>('/one-on-one-action-items', payload);
//   return unwrapData<ActionItem>(res.data, {} as ActionItem);
// };
//
// export const getActionItemByMeeting = async (meetingId: number): Promise<ActionItem | null> => {
//   const res = await api.get<ApiResponse<ActionItem | null>>(
//     `/one-on-one-action-items/meeting/${meetingId}`
//   );
//   return res.data?.data ?? null;
// };
//
// export const getActiveEmployeesByDepartment = async (
//   departmentId: number
// ): Promise<EmployeeOption[]> => {
//   const res = await api.get<ApiResponse<EmployeeOption[]>>(
//     `/employees/active-by-department/${departmentId}`
//   );
//   return Array.isArray(res.data?.data) ? res.data.data : [];
// };


// import api from './api';
//
// export interface Meeting {
//   id: number;
//   employeeId: number;
//   employeeFirstName: string;
//   employeeLastName: string;
//   managerId: number;
//   managerFirstName: string;
//   managerLastName: string;
//   scheduledDate: string;
//   notes: string | null;
//   followUpNotes?: string | null;
//   status: boolean;
//   followUpDate: string | null;
//   isFinalized: string | null;
//   createdAt: string;
//   updatedAt?: string | null;
//   parentMeetingId: number | null;
//   followUp: boolean;
//   actionItem: ActionItem | null;
//
//   followUpMeetingId?: number | null;
//   followUpStartDate?: string | null;
//   followUpEndDate?: string | null;
//   followUpMeetingNotes?: string | null;
// }
//
// export interface ActionItem {
//   id: number;
//   meetingId: number;
//   description: string;
//   createdAt?: string | null;
//   updatedAt?: string | null;
//   dueDate?: string | null;
//   owner?: string | null;
//   status?: string | null;
// }
//
// export interface CreateMeetingPayload {
//   employeeId: number;
//   scheduledDate: string;
//   notes: string;
//   parentMeetingId?: number | null;
//   followUpNotes?: string | null;
// }
//
// export interface UpdateMeetingPayload {
//   employeeId?: number;
//   scheduledDate: string;
//   notes: string;
//   parentMeetingId?: number | null;
//   followUpNotes?: string | null;
// }
//
// export interface SaveActionItemPayload {
//   meetingId: number;
//   description: string;
// }
//
// export interface FollowUpPayload {
//   followUpDate: string;
// }
//
// export interface EmployeeOption {
//   id: number;
//   firstName: string;
//   lastName: string;
// }
//
// type ApiResponse<T> = { data: T; message: string; success: boolean };
//
// const unwrapData = <T>(payload: any, fallback: T): T => {
//   if (payload?.data !== undefined) return payload.data as T;
//   if (payload !== undefined) return payload as T;
//   return fallback;
// };
//
// export const createMeeting = async (payload: CreateMeetingPayload): Promise<Meeting> => {
//   const res = await api.post<ApiResponse<Meeting>>('/one-on-one-meetings', payload);
//   return unwrapData<Meeting>(res.data, {} as Meeting);
// };
//
// export const updateMeeting = async (
//   id: number,
//   payload: UpdateMeetingPayload
// ): Promise<Meeting> => {
//   const res = await api.put<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}`, payload);
//   return unwrapData<Meeting>(res.data, {} as Meeting);
// };
//
// export const deleteMeeting = async (id: number): Promise<void> => {
//   await api.delete(`/one-on-one-meetings/${id}`);
// };
//
// export const getUpcomingMeetings = async (): Promise<Meeting[]> => {
//   const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/upcoming');
//   return Array.isArray(res.data?.data) ? res.data.data : [];
// };
//
// export const getOngoingMeetings = async (): Promise<Meeting[]> => {
//   const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/ongoing');
//   return Array.isArray(res.data?.data) ? res.data.data : [];
// };
//
// export const getPastMeetings = async (): Promise<Meeting[]> => {
//   const res = await api.get<ApiResponse<Meeting[]>>('/one-on-one-meetings/past');
//   return Array.isArray(res.data?.data) ? res.data.data : [];
// };
//
// export const getMeetingById = async (id: number): Promise<Meeting> => {
//   const res = await api.get<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}`);
//   return unwrapData<Meeting>(res.data, {} as Meeting);
// };
//
// export const finishMeeting = async (id: number): Promise<Meeting> => {
//   const res = await api.post<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}/finish`);
//   return unwrapData<Meeting>(res.data, {} as Meeting);
// };
//
// export const setFollowUp = async (id: number, payload: FollowUpPayload): Promise<Meeting> => {
//   const res = await api.put<ApiResponse<Meeting>>(`/one-on-one-meetings/${id}/follow-up`, payload);
//   return unwrapData<Meeting>(res.data, {} as Meeting);
// };
//
// export const saveActionItem = async (payload: SaveActionItemPayload): Promise<ActionItem> => {
//   const res = await api.post<ApiResponse<ActionItem>>('/one-on-one-action-items', payload);
//   return unwrapData<ActionItem>(res.data, {} as ActionItem);
// };
//
// export const getActionItemByMeeting = async (meetingId: number): Promise<ActionItem | null> => {
//   const res = await api.get<ApiResponse<ActionItem | null>>(
//     `/one-on-one-action-items/meeting/${meetingId}`
//   );
//   return res.data?.data ?? null;
// };
//
// export const getActiveEmployeesByDepartment = async (
//   departmentId: number
// ): Promise<EmployeeOption[]> => {
//   const res = await api.get<ApiResponse<EmployeeOption[]>>(
//     `/employees/active-by-department/${departmentId}`
//   );
//   return Array.isArray(res.data?.data) ? res.data.data : [];
// };



/*
  Why this file is updated:
  - Adds location to one-on-one meeting request and response.
  - The same location field can be used by normal meeting creation and follow-up meeting creation.
*/
/*

import api from './api';

export interface EmployeeOption {
  id: number;
  firstName: string;
  lastName: string;
}

export interface Meeting {
  id: number;
  employeeId: number;
  employeeFirstName: string;
  employeeLastName: string;
  managerId: number;
  managerFirstName: string;
  managerLastName: string;
  scheduledDate: string;
  location?: string | null;
  notes?: string | null;
  status?: boolean;
  followUpDate?: string | null;
  isFinalized?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  parentMeetingId?: number | null;
  followUp?: boolean;
  followUpNotes?: string | null;
  followUpMeetingId?: number | null;
  followUpStartDate?: string | null;
  followUpEndDate?: string | null;
  followUpMeetingNotes?: string | null;
  followUpLocation?: string | null;
}

export interface CreateMeetingRequest {
  employeeId: number;
  scheduledDate: string;
  location?: string;
  notes?: string;
  parentMeetingId?: number;
  followUpNotes?: string;
}

export interface FollowUpRequest {
  followUpDate: string;
  location?: string;
  followUpNotes?: string;
}

function unwrap<T>(response: any): T {
  if (response?.data?.data !== undefined) {
    return response.data.data as T;
  }

  return response.data as T;
}

export async function getActiveEmployeesByDepartment(
  departmentId: number
): Promise<EmployeeOption[]> {
  const response = await api.get(`/employees/active-by-department/${departmentId}`);
  return unwrap<EmployeeOption[]>(response);
}

export async function createMeeting(payload: CreateMeetingRequest): Promise<Meeting> {
  const response = await api.post('/one-on-one-meetings', payload);
  return unwrap<Meeting>(response);
}

export async function getUpcomingMeetings(): Promise<Meeting[]> {
  const response = await api.get('/one-on-one-meetings/upcoming');
  return unwrap<Meeting[]>(response);
}

export async function getOngoingMeetings(): Promise<Meeting[]> {
  const response = await api.get('/one-on-one-meetings/ongoing');
  return unwrap<Meeting[]>(response);
}

export async function getPastMeetings(): Promise<Meeting[]> {
  const response = await api.get('/one-on-one-meetings/past');
  return unwrap<Meeting[]>(response);
}

export async function getMeetingById(id: number): Promise<Meeting> {
  const response = await api.get(`/one-on-one-meetings/${id}`);
  return unwrap<Meeting>(response);
}

export async function finishMeeting(id: number): Promise<Meeting> {
  const response = await api.post(`/one-on-one-meetings/${id}/finish`);
  return unwrap<Meeting>(response);
}

export async function createFollowUpMeeting(
  meetingId: number,
  payload: FollowUpRequest
): Promise<Meeting> {
  const response = await api.post(`/one-on-one-meetings/${meetingId}/follow-up`, payload);
  return unwrap<Meeting>(response);
}

export async function deleteMeeting(id: number): Promise<void> {
  await api.delete(`/one-on-one-meetings/${id}`);
} */








/*
  oneOnOneService.ts

  Why this file is fixed:
  - Restores old exports used by OneOnOneActionItems.tsx:
      saveActionItem
      setFollowUp
      updateMeeting
  - Keeps new location support.
  - Keeps createFollowUpMeeting as the newer clearer function name.
*/
/*

import api from './api';

export interface EmployeeOption {
  id: number;
  firstName: string;
  lastName: string;
}

export interface Meeting {
  id: number;
  employeeId: number;
  employeeFirstName: string;
  employeeLastName: string;
  managerId: number;
  managerFirstName: string;
  managerLastName: string;
  scheduledDate: string;
  location?: string | null;
  notes?: string | null;
  status?: boolean;
  followUpDate?: string | null;
  isFinalized?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  parentMeetingId?: number | null;
  followUp?: boolean;
  followUpNotes?: string | null;
  followUpMeetingId?: number | null;
  followUpStartDate?: string | null;
  followUpEndDate?: string | null;
  followUpMeetingNotes?: string | null;
  followUpLocation?: string | null;
  actionItem?: OneOnOneActionItem | null;
}

export interface CreateMeetingRequest {
  employeeId: number;
  scheduledDate: string;
  location?: string;
  notes?: string;
  parentMeetingId?: number;
  followUpNotes?: string;
}

export interface UpdateMeetingRequest {
  employeeId?: number;
  scheduledDate: string;
  location?: string;
  notes?: string;
  parentMeetingId?: number | null;
  followUpNotes?: string;
}

export interface FollowUpRequest {
  followUpDate: string;
  location?: string;
  followUpNotes?: string;
}

export interface OneOnOneActionItem {
  id?: number;
  meetingId?: number;
  description?: string;
  owner?: string;
  status?: string;
  dueDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SaveActionItemRequest {
  meetingId?: number;
  description?: string;
  owner?: string;
  status?: string;
  dueDate?: string | null;
}

function unwrap<T>(response: any): T {
  if (response?.data?.data !== undefined) {
    return response.data.data as T;
  }

  return response.data as T;
}

export async function getActiveEmployeesByDepartment(
  departmentId: number
): Promise<EmployeeOption[]> {
  const response = await api.get(`/employees/active-by-department/${departmentId}`);
  return unwrap<EmployeeOption[]>(response);
}

export async function createMeeting(payload: CreateMeetingRequest): Promise<Meeting> {
  const response = await api.post('/one-on-one-meetings', payload);
  return unwrap<Meeting>(response);
}

 */
/*
  Restored old export used by OneOnOneActionItems.tsx.
  It also supports location now.
*//*

export async function updateMeeting(
  meetingId: number,
  payload: UpdateMeetingRequest
): Promise<Meeting> {
  const response = await api.put(`/one-on-one-meetings/${meetingId}`, payload);
  return unwrap<Meeting>(response);
}

export async function getUpcomingMeetings(): Promise<Meeting[]> {
  const response = await api.get('/one-on-one-meetings/upcoming');
  return unwrap<Meeting[]>(response);
}

export async function getOngoingMeetings(): Promise<Meeting[]> {
  const response = await api.get('/one-on-one-meetings/ongoing');
  return unwrap<Meeting[]>(response);
}

export async function getPastMeetings(): Promise<Meeting[]> {
  const response = await api.get('/one-on-one-meetings/past');
  return unwrap<Meeting[]>(response);
}

export async function getMeetingById(id: number): Promise<Meeting> {
  const response = await api.get(`/one-on-one-meetings/${id}`);
  return unwrap<Meeting>(response);
}

export async function finishMeeting(id: number): Promise<Meeting> {
  const response = await api.post(`/one-on-one-meetings/${id}/finish`);
  return unwrap<Meeting>(response);
}

export async function createFollowUpMeeting(
  meetingId: number,
  payload: FollowUpRequest
): Promise<Meeting> {
  const response = await api.post(`/one-on-one-meetings/${meetingId}/follow-up`, payload);
  return unwrap<Meeting>(response);
}

 */
/*
  Backward-compatible old function name.

  OneOnOneActionItems.tsx imports:
    setFollowUp
*//*

export async function setFollowUp(
  meetingId: number,
  payload: FollowUpRequest
): Promise<Meeting> {
  return createFollowUpMeeting(meetingId, payload);
}

export async function deleteMeeting(id: number): Promise<void> {
  await api.delete(`/one-on-one-meetings/${id}`);
}

 */
/*
  Action item APIs.

  Supports both:
    saveActionItem(payload)
    saveActionItem(meetingId, payload)
*//*

export async function saveActionItem(
  meetingIdOrPayload: number | SaveActionItemRequest,
  payload?: SaveActionItemRequest
): Promise<OneOnOneActionItem> {
  const body =
    typeof meetingIdOrPayload === 'number'
      ? { ...(payload || {}), meetingId: meetingIdOrPayload }
      : meetingIdOrPayload;

  const response = await api.post('/one-on-one-action-items', body);
  return unwrap<OneOnOneActionItem>(response);
}

export async function getActionItems(): Promise<OneOnOneActionItem[]> {
  const response = await api.get('/one-on-one-action-items');
  return unwrap<OneOnOneActionItem[]>(response);
}

export async function getActionItemByMeetingId(
  meetingId: number
): Promise<OneOnOneActionItem | null> {
  const response = await api.get(`/one-on-one-action-items/meeting/${meetingId}`);
  return unwrap<OneOnOneActionItem | null>(response);
}

export async function updateActionItem(
  id: number,
  payload: SaveActionItemRequest
): Promise<OneOnOneActionItem> {
  const response = await api.put(`/one-on-one-action-items/${id}`, payload);
  return unwrap<OneOnOneActionItem>(response);
}

export async function deleteActionItem(id: number): Promise<void> {
  await api.delete(`/one-on-one-action-items/${id}`);
} */








import api from './api';

export interface EmployeeOption {
  id: number;
  firstName: string;
  lastName: string;
}

export interface OneOnOneActionItem {
  id?: number;
  meetingId?: number;
  description?: string;
  owner?: string;
  status?: string;
  dueDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Meeting {
  id: number;
  employeeId: number;
  employeeFirstName: string;
  employeeLastName: string;
  managerId: number;
  managerFirstName: string;
  managerLastName: string;
  scheduledDate: string;
  location?: string | null;
  notes?: string | null;
  status?: boolean;
  followUpDate?: string | null;
  isFinalized?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  parentMeetingId?: number | null;
  followUp?: boolean;
  followUpNotes?: string | null;
  followUpMeetingId?: number | null;
  followUpStartDate?: string | null;
  followUpEndDate?: string | null;
  followUpMeetingNotes?: string | null;
  followUpLocation?: string | null;
  actionItem?: OneOnOneActionItem | null;
}

export interface CreateMeetingRequest {
  employeeId: number;
  scheduledDate: string;
  location?: string;
  notes?: string;
  parentMeetingId?: number;
  followUpNotes?: string;
}

export interface UpdateMeetingRequest {
  employeeId?: number;
  scheduledDate: string;
  location?: string;
  notes?: string;
  parentMeetingId?: number | null;
  followUpNotes?: string;
}

export interface FollowUpRequest {
  followUpDate: string;
  location?: string;
  followUpNotes?: string;
}

export interface SaveActionItemRequest {
  meetingId?: number;
  description?: string;
  owner?: string;
  status?: string;
  dueDate?: string | null;
}

function unwrap<T>(response: any): T {
  if (response?.data?.data !== undefined) {
    return response.data.data as T;
  }

  return response.data as T;
}

export async function getActiveEmployeesByDepartment(
  departmentId: number
): Promise<EmployeeOption[]> {
  const response = await api.get(`/employees/active-by-department/${departmentId}`);
  return unwrap<EmployeeOption[]>(response);
}

export async function createMeeting(payload: CreateMeetingRequest): Promise<Meeting> {
  const response = await api.post('/one-on-one-meetings', payload);
  return unwrap<Meeting>(response);
}

export async function updateMeeting(
  meetingId: number,
  payload: UpdateMeetingRequest
): Promise<Meeting> {
  const response = await api.put(`/one-on-one-meetings/${meetingId}`, payload);
  return unwrap<Meeting>(response);
}

export async function getUpcomingMeetings(): Promise<Meeting[]> {
  const response = await api.get('/one-on-one-meetings/upcoming');
  return unwrap<Meeting[]>(response);
}

export async function getOngoingMeetings(): Promise<Meeting[]> {
  const response = await api.get('/one-on-one-meetings/ongoing');
  return unwrap<Meeting[]>(response);
}

export async function getPastMeetings(): Promise<Meeting[]> {
  const response = await api.get('/one-on-one-meetings/past');
  return unwrap<Meeting[]>(response);
}

export async function getMeetingById(id: number): Promise<Meeting> {
  const response = await api.get(`/one-on-one-meetings/${id}`);
  return unwrap<Meeting>(response);
}

export async function finishMeeting(id: number): Promise<Meeting> {
  const response = await api.post(`/one-on-one-meetings/${id}/finish`);
  return unwrap<Meeting>(response);
}

export async function createFollowUpMeeting(
  meetingId: number,
  payload: FollowUpRequest
): Promise<Meeting> {
  const response = await api.put(`/one-on-one-meetings/${meetingId}/follow-up`, payload);
  return unwrap<Meeting>(response);
}

export async function setFollowUp(
  meetingId: number,
  payload: FollowUpRequest
): Promise<Meeting> {
  return createFollowUpMeeting(meetingId, payload);
}

export async function deleteMeeting(id: number): Promise<void> {
  await api.delete(`/one-on-one-meetings/${id}`);
}

export async function saveActionItem(
  meetingIdOrPayload: number | SaveActionItemRequest,
  payload?: SaveActionItemRequest
): Promise<OneOnOneActionItem> {
  const body =
    typeof meetingIdOrPayload === 'number'
      ? { ...(payload || {}), meetingId: meetingIdOrPayload }
      : meetingIdOrPayload;

  const response = await api.post('/one-on-one-action-items', body);
  return unwrap<OneOnOneActionItem>(response);
}

export async function getActionItems(): Promise<OneOnOneActionItem[]> {
  const response = await api.get('/one-on-one-action-items');
  return unwrap<OneOnOneActionItem[]>(response);
}

export async function getActionItemByMeetingId(
  meetingId: number
): Promise<OneOnOneActionItem | null> {
  const response = await api.get(`/one-on-one-action-items/meeting/${meetingId}`);
  return unwrap<OneOnOneActionItem | null>(response);
}

export async function updateActionItem(
  id: number,
  payload: SaveActionItemRequest
): Promise<OneOnOneActionItem> {
  const response = await api.put(`/one-on-one-action-items/${id}`, payload);
  return unwrap<OneOnOneActionItem>(response);
}