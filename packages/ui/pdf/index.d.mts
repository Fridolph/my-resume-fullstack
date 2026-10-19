import type { ResumeDocument, ResumeSection } from '@rs/common'
export function orderedSections(document: ResumeDocument): ResumeSection[]
export function resumePdfBlocks(document: ResumeDocument): { id: string; heading: boolean; html: string }[]
export const RESUME_PDF_CSS: string
export function paginateResumePdf(document: Document, author?: string): Promise<number>
export function createResumePdfHtml(document: ResumeDocument, title?: string): string
