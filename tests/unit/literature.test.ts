import {it,expect} from "vitest";
import {PDFDocument} from "pdf-lib";
import {inspectPdf} from "../../src/modules/files/pdf";
import {normalizeDoi,uploadSchema} from "../../src/modules/literature/schemas";
it("normalizes DOI URLs and rejects oversized uploads",()=>{expect(normalizeDoi(" https://doi.org/10.1000/ABC ")).toBe("10.1000/abc");expect(uploadSchema.safeParse({key:"37e37042-de0e-4d59-98c0-30759e2b90aa",enrollmentId:"37e37042-de0e-4d59-98c0-30759e2b90aa",name:"large.pdf",size:52428801}).success).toBe(false);});
it("checks PDF bytes rather than filename and extracts page count",async()=>{const pdf=await PDFDocument.create();pdf.addPage();pdf.addPage();const bytes=await pdf.save();const result=await inspectPdf(bytes);expect(result.pageCount).toBe(2);expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);await expect(inspectPdf(Buffer.from("pretend PDF"))).rejects.toThrow("PDF");await expect(inspectPdf(Buffer.from("%PDF-1.7 corrupted"))).rejects.toThrow();});
