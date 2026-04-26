import { z } from 'zod';

export const employeeFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  staffNrc: z.string().optional(),
  gender: z.string().optional(),
  race: z.string().optional(),
  religion: z.string().optional(),
  dateOfBirth: z.string().optional(),
  contactAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  maritalStatus: z.string().optional(),
  spouseName: z.string().optional(),
  spouseNrc: z.string().optional(),
  fatherName: z.string().optional(),
  fatherNrc: z.string().optional(),
  positionId: z.string().optional(),
  departmentId: z.string().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export const defaultEmployeeFormValues: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  staffNrc: '',
  gender: '',
  race: '',
  religion: '',
  dateOfBirth: '',
  contactAddress: '',
  permanentAddress: '',
  maritalStatus: '',
  spouseName: '',
  spouseNrc: '',
  fatherName: '',
  fatherNrc: '',
  positionId: '',
  departmentId: '',
};

export function formValuesToPayload(values: EmployeeFormValues) {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    phoneNumber: values.phoneNumber,
    staffNrc: values.staffNrc,
    gender: values.gender,
    race: values.race,
    religion: values.religion,
    dateOfBirth: values.dateOfBirth,
    contactAddress: values.contactAddress,
    permanentAddress: values.permanentAddress,
    maritalStatus: values.maritalStatus,
    spouseName: values.spouseName,
    spouseNrc: values.spouseNrc,
    fatherName: values.fatherName,
    fatherNrc: values.fatherNrc,
    positionId: (() => {
      if (!values.positionId || values.positionId === '') {
        return null;
      }
      const n = Number.parseInt(values.positionId, 10);
      return Number.isFinite(n) ? n : null;
    })(),
    departmentId: (() => {
      if (!values.departmentId || values.departmentId === '') {
        return null;
      }
      const n = Number.parseInt(values.departmentId, 10);
      return Number.isFinite(n) ? n : null;
    })(),
  };
}
