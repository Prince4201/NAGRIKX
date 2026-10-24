import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().min(3, "Enter your email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
    email: z.string().trim().email("Enter a valid email address").max(255),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
    consent: z.literal(true, { message: "Please accept the privacy terms to continue" }),
    accountType: z.enum(['citizen', 'department_officer']).default('citizen'),
    departmentId: z.string().optional(),
    designation: z.string().trim().max(80).optional(),
    employeeId: z.string().trim().max(40).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.accountType !== 'department_officer' || Boolean(d.departmentId), {
    message: "Please select a department for officer verification",
    path: ["departmentId"],
  });

export const REPORT_LIMITS = {
  titleMax: 80,
  descriptionMin: 20,
  descriptionMax: 600,
  maxImages: 4,
  maxImageMB: 5,
};

export const reportDetailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(6, "Give the issue a short, clear title")
    .max(REPORT_LIMITS.titleMax),
  description: z
    .string()
    .trim()
    .min(
      REPORT_LIMITS.descriptionMin,
      `Describe it in at least ${REPORT_LIMITS.descriptionMin} characters`,
    )
    .max(REPORT_LIMITS.descriptionMax),
  category: z.string().min(1, "Choose a category"),
});

export const reportLocationSchema = z.object({
  address: z.string().trim().min(5, "Enter a street, landmark or area").max(200),
  city: z.string().trim().min(2, "Enter your city").max(80),
});

export type FieldErrors = Record<string, string>;

/** Turn a zod result into a flat { field: message } map. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const pgUuid = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'Invalid UUID');

export const roleSchema = z.enum(['citizen', 'department_officer', 'admin']);
export const statusSchema = z.enum(['reported', 'in_review', 'in_progress', 'resolved', 'rejected']);
export const reportSubmitSchema = reportDetailsSchema.merge(reportLocationSchema).extend({
  id: pgUuid, category: z.enum(['roads','garbage','streetlight','water','drainage','infrastructure','other']),
  latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(),
  photos: z.array(z.string().max(300)).max(4),
});
export const commentSchema = z.object({ id: pgUuid, message: z.string().trim().min(2).max(1000) });
export const workflowSchema = z.object({ id: pgUuid, status: statusSchema, priority: z.enum(['normal','high','urgent']), department: pgUuid.nullable(), officer: pgUuid.nullable(), visible: z.boolean(), note: z.string().trim().min(5).max(1000) });
export const profileSchema = z.object({ full_name: z.string().trim().min(2).max(80), city: z.string().trim().max(80), notifications_enabled: z.boolean() });
export const grantRoleSchema = z.object({ user: pgUuid, role: roleSchema, department: pgUuid.nullable() }).refine(d => d.role !== 'department_officer' || Boolean(d.department), 'Choose an officer department');
export const departmentSchema = z.object({ id: pgUuid.nullable(), name: z.string().trim().min(2).max(100), city: z.string().trim().max(80), categories: z.array(reportSubmitSchema.shape.category).min(1), active: z.boolean() });

