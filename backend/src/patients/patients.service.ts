import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as dotenv from 'dotenv';

// ✅ Load .env file
dotenv.config();

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {
    // ✅ Use CLOUDINARY_URL - it's simpler and always works
    if (process.env.CLOUDINARY_URL) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      console.log('✅ Cloudinary configured via URL');
    } else {
      console.error('❌ CLOUDINARY_URL not found in .env');
    }
  }

  // ==================== GET PATIENT BY USER ID ====================
  async getPatientByUserId(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: {
        ehrDocuments: true,
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    return patient; // Returns null if not found
  }

  // ==================== GET PATIENT BY PATIENT ID ====================
  async getPatientById(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        ehrDocuments: true,
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  // ==================== UPDATE PATIENT BY USER ID ====================
  async updatePatientByUserId(userId: string, updateData: any) {
  console.log('🔵 updatePatientByUserId - userId:', userId);
  
  // Try to find existing patient
  let patient = await this.prisma.patient.findUnique({
    where: { userId },
  });

  // ✅ If no patient exists, CREATE one
  if (!patient) {
    console.log('⚠️ Patient not found, creating new patient for userId:', userId);
    patient = await this.prisma.patient.create({
      data: {
        userId: userId,
        name: updateData.name || 'New Patient',
        dateOfBirth: updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null,
        bloodGroup: updateData.bloodGroup || null,
        emergencyContact: updateData.emergencyContact || null,
        emergencyContactName: updateData.emergencyContactName || null,
        emergencyContactRelation: updateData.emergencyContactRelation || null,
        address: updateData.address || null,
        height: updateData.height ? Number(updateData.height) : null,
        weight: updateData.weight ? Number(updateData.weight) : null,
        allergies: updateData.allergies || [],
        currentMedications: updateData.currentMedications || [],
      },
      include: {
        ehrDocuments: true,
      },
    });
    console.log('✅ Patient created:', patient.id);
    return patient;
  }

  // ✅ Update existing patient
  const data: any = {};
  if (updateData.name !== undefined) data.name = updateData.name;
  if (updateData.bloodGroup !== undefined) data.bloodGroup = updateData.bloodGroup || null;
  if (updateData.emergencyContact !== undefined) data.emergencyContact = updateData.emergencyContact || null;
  if (updateData.emergencyContactName !== undefined) data.emergencyContactName = updateData.emergencyContactName || null;
  if (updateData.emergencyContactRelation !== undefined) data.emergencyContactRelation = updateData.emergencyContactRelation || null;
  if (updateData.address !== undefined) data.address = updateData.address || null;
  if (updateData.allergies !== undefined) data.allergies = updateData.allergies || [];
  if (updateData.currentMedications !== undefined) data.currentMedications = updateData.currentMedications || [];
  if (updateData.height !== undefined) {
    data.height = updateData.height ? Number(updateData.height) : null;
  }
  if (updateData.weight !== undefined) {
    data.weight = updateData.weight ? Number(updateData.weight) : null;
  }
  if (updateData.dateOfBirth !== undefined) {
    data.dateOfBirth = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null;
  }

  console.log('📤 Updating patient with data:', data);

  const updated = await this.prisma.patient.update({
    where: { userId },
    data,
    include: {
      ehrDocuments: true,
    },
  });

  console.log('✅ Patient updated:', updated.id);
  return updated;
}
  // ==================== UPDATE PATIENT BY PATIENT ID ====================
  async updatePatient(patientId: string, updateData: any) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const data: any = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.dateOfBirth !== undefined) data.dateOfBirth = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null;
    if (updateData.bloodGroup !== undefined) data.bloodGroup = updateData.bloodGroup || null;
    if (updateData.emergencyContact !== undefined) data.emergencyContact = updateData.emergencyContact || null;
    if (updateData.emergencyContactName !== undefined) data.emergencyContactName = updateData.emergencyContactName || null;
    if (updateData.emergencyContactRelation !== undefined) data.emergencyContactRelation = updateData.emergencyContactRelation || null;
    if (updateData.address !== undefined) data.address = updateData.address || null;
    if (updateData.height !== undefined) data.height = updateData.height ? parseInt(updateData.height) : null;
    if (updateData.weight !== undefined) data.weight = updateData.weight ? parseInt(updateData.weight) : null;
    if (updateData.allergies !== undefined) data.allergies = updateData.allergies || [];
    if (updateData.currentMedications !== undefined) data.currentMedications = updateData.currentMedications || [];

    return this.prisma.patient.update({
      where: { id: patientId },
      data,
      include: {
        ehrDocuments: true,
      },
    });
  }

   async uploadMedia(patientId: string, files: Express.Multer.File[]) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const uploadedFiles = [];
    
    for (const file of files) {
      // ✅ Upload to Cloudinary with proper typing
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: 'healthcare/patients/ehr',
          },
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('Upload failed - no result returned'));
            }
          }
        ).end(file.buffer);
      });

      // ✅ Now TypeScript knows result has secure_url
      const doc = await this.prisma.ehrDocument.create({
        data: {
          patientId: patientId,
          fileUrl: result.secure_url,
          fileName: file.originalname,
          mimeType: file.mimetype,
        },
      });
      uploadedFiles.push(doc);
    }

    return uploadedFiles;
  }

  // ==================== DELETE MEDIA ====================
  async deleteMedia(mediaId: string, requestingUserId: string) {
    const media = await this.prisma.ehrDocument.findUnique({
      where: { id: mediaId },
      include: { patient: true },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.patient.userId !== requestingUserId) {
      throw new UnauthorizedException('Not authorized to delete this file');
    }

    // Extract public_id from Cloudinary URL
    const urlParts = media.fileUrl.split('/');
    const publicIdWithExtension = urlParts.slice(-1)[0];
    const publicId = `healthcare/patients/ehr/${publicIdWithExtension.split('.')[0]}`;
    
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.log('Cloudinary delete failed, continuing...', error);
    }

    await this.prisma.ehrDocument.delete({
      where: { id: mediaId },
    });

    return { message: 'File deleted successfully' };
  }


  // ==================== GET MY PATIENTS ====================
async getMyPatients(doctorUserId: string) {
  console.log('🔵 getMyPatients called for userId:', doctorUserId);
  
  // Get doctor by user ID
  const doctor = await this.prisma.doctor.findUnique({
    where: { userId: doctorUserId },
  });

  console.log('🔵 Doctor found:', doctor ? doctor.id : 'NOT FOUND');

  if (!doctor) {
    console.log('❌ Doctor not found for userId:', doctorUserId);
    // ✅ Return empty array instead of throwing error
    return [];
  }

  // Get all unique patients who have appointments with this doctor
  const appointments = await this.prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      status: {
        notIn: ['CANCELLED', 'NO_SHOW'],
      },
    },
    include: {
      patient: {
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log('🔵 Appointments found:', appointments.length);

  // Get unique patients with their last appointment
  const patientMap = new Map();
  appointments.forEach(appt => {
    if (!patientMap.has(appt.patient.id)) {
      patientMap.set(appt.patient.id, {
        ...appt.patient,
        appointmentCount: 1,
        lastAppointment: {
          scheduledAt: appt.scheduledAt,
          type: appt.type,
          status: appt.status,
        },
      });
    } else {
      const existing = patientMap.get(appt.patient.id);
      existing.appointmentCount = (existing.appointmentCount || 0) + 1;
      if (new Date(appt.scheduledAt) > new Date(existing.lastAppointment?.scheduledAt || 0)) {
        existing.lastAppointment = {
          scheduledAt: appt.scheduledAt,
          type: appt.type,
          status: appt.status,
        };
      }
    }
  });

  const result = Array.from(patientMap.values());
  console.log('🔵 Patients returned:', result.length);
  return result;
}
}


