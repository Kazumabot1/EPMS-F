/*
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
}  */






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
  status?: boolean | null;
  firstMeetingEndDate?: string | null;

  followUpDate?: string | null;
  followUpGoal?: string | null;
  followUpNotes?: string | null;
  followUpLocation?: string | null;
  followUpStatus?: boolean | null;
  followUpEndDate?: string | null;
  followUpReminder24hSent?: boolean | null;

  isFinalized?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  parentMeetingId?: number | null;
  followUp?: boolean | null;

  followUpMeetingId?: number | null;
  followUpStartDate?: string | null;
  followUpMeetingNotes?: string | null;

  actionItem?: OneOnOneActionItem | null;
}

export interface CreateMeetingRequest {
  employeeId: number;
  scheduledDate: string;
  location?: string;
  notes?: string;
}

export interface UpdateMeetingRequest {
  employeeId?: number;
  scheduledDate: string;
  location?: string;
  notes?: string;
  followUpNotes?: string;
}

export interface FollowUpRequest {
  followUpDate: string;
  location?: string;
  followUpGoal?: string;
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