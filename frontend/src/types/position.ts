/*
export interface PositionLevelRequest {
  levelCode: string;
}

export interface PositionLevelResponse {
  id: number;
  levelCode: string;
}

export interface PositionRequest {
  positionTitle: string;
  levelId: number;
  description: string;
  status: boolean;
  createdBy: string;
}

export interface PositionResponse {
  id: number;
  positionTitle: string;
  levelId: number;
  levelCode: string;
  description: string;
  status: boolean;
  createdAt: string;
  createdBy: string;
}
 */









/*

export interface PositionLevelRequest {
  levelCode: string;
  active?: boolean;
  reason?: string;
}

export interface PositionLevelResponse {
  id: number;
  levelCode: string;
  active?: boolean;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
}

export interface PositionRequest {
  positionTitle: string;
  levelId: number;
  description: string;
  status: boolean;
  createdBy: string;
}

export interface PositionResponse {
  id: number;
  positionTitle: string;
  levelId: number;
  levelCode: string;
  description: string;
  status: boolean;
  createdAt: string;
  createdBy: string;
} */






export interface PositionLevelRequest {
  levelCode: string;
  active?: boolean;
  reason?: string;
}

export interface PositionLevelResponse {
  id: number;
  levelCode: string;
  active?: boolean;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
}

export interface PositionRequest {
  positionTitle: string;
  levelId: number;
  description: string;
  status: boolean;
  createdBy?: string;
  reason?: string;
}

export interface PositionResponse {
  id: number;
  positionTitle: string;
  levelId: number;
  levelCode: string;
  description: string;
  status: boolean;
  createdAt: string;
  createdBy: string;
}
