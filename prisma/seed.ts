// prisma/seed.ts
// Run with: npx ts-node prisma/seed.ts
// Creates a hardcoded admin user and a test employer user if they don't already exist.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {

  // 1. Admin
  const adminEmail = 'admin@talvio.com';
  const adminPassword = 'Admin@1234';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashed,
        role: 'ADMIN',
        firstName: 'Talvio',
        lastName: 'Admin',
        isVerified: true,
      },
    });
    console.log('✅ Admin created');
  }

  // 2. Employer & Job Posts
  const employerEmail = 'employer@test.com';
  const employerPassword = 'Test@1234';
  const existingEmployer = await prisma.user.findUnique({ where: { email: employerEmail } });
  let employerId = existingEmployer?.id;

  if (!existingEmployer) {
    const hashed = await bcrypt.hash(employerPassword, 10);
    const employer = await prisma.user.create({
      data: {
        email: employerEmail,
        password: hashed,
        role: 'EMPLOYER',
        firstName: 'Talvio',
        lastName: 'Solutions',
        isVerified: true,
        employerProfile: {
          create: {
            companyName: 'Talvio Tech',
            registrationFileUrl: 'https://utfs.io/f/sample-pdf.pdf',
            registrationFileName: 'registration.pdf',
            verificationStatus: 'APPROVED',
            companyDescription: 'Leading tech solutions provider specializing in AI and software development.',
          },
        },
      },
      include: { employerProfile: true }
    });
    employerId = employer.id;
    console.log('✅ Employer created');
  }

  const employerProfile = await prisma.employerProfile.findUnique({ where: { userId: employerId! } });
  const employerProfileId = employerProfile!.id;

  // Create Job Posts
  const jobPosts = [
    {
      id: 'fb7b1f1a-6d1a-4d7a-8d1a-6d1a4d7a8d1a',
      title: 'Frontend Developer Intern',
      type: 'INTERNSHIP',
      description: 'Join our team as a Frontend Intern. You will work with React, Tailwind CSS, and TypeScript to build beautiful user interfaces.',
      location: 'Colombo',
      workMode: 'REMOTE',
      employmentType: 'FULL_TIME',
      skillsRequired: ['React', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'HTML', 'CSS'],
      status: 'ACTIVE',
    },
    {
      id: 'cb7b1f1a-6d1a-4d7a-8d1a-6d1a4d7a8d1b',
      title: 'Backend Developer Intern',
      type: 'INTERNSHIP',
      description: 'We are looking for a Node.js enthusiast to help us build scalable backend services and APIs.',
      location: 'Remote',
      workMode: 'REMOTE',
      employmentType: 'FULL_TIME',
      skillsRequired: ['Node.js', 'Express', 'PostgreSQL', 'Prisma', 'REST API', 'JavaScript'],
      status: 'ACTIVE',
    },
    {
      id: 'db7b1f1a-6d1a-4d7a-8d1a-6d1a4d7a8d1c',
      title: 'UI/UX Designer Intern',
      type: 'INTERNSHIP',
      description: 'Passionate about design? Join us to create intuitive user experiences and mockups for our web applications.',
      location: 'Kandy',
      workMode: 'HYBRID',
      employmentType: 'PART_TIME',
      skillsRequired: ['Figma', 'Adobe XD', 'UI Design', 'UX Research', 'Prototyping'],
      status: 'ACTIVE',
    }
  ];

  for (const post of jobPosts) {
    await prisma.jobPost.upsert({
      where: { id: post.id },
      create: { 
        ...post, 
        employerId: employerProfileId,
      } as any,
      update: {},
    });
  }
  console.log('✅ Job Posts seeded');

  // 3. Student User
  const studentEmail = 'student@test.com';
  const hashedStudent = await bcrypt.hash('Test@1234', 10);
  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    update: { role: 'STUDENT' }, // Ensure role is correct
    create: {
      email: studentEmail,
      password: hashedStudent,
      role: 'STUDENT',
      firstName: 'Test',
      lastName: 'Student',
      isVerified: true,
    }
  });

  const studentProfileData = {
    headline: 'Aspiring Web Developer',
    skills: ['React', 'JavaScript'],
    extractedSkills: [], // Start empty for testing upload
    cvUrl: null,
    cvFileName: null,
  };

  await prisma.candidateProfile.upsert({
    where: { userId: student.id },
    update: studentProfileData,
    create: {
      userId: student.id,
      ...studentProfileData
    } as any
  });
  console.log('✅ Student created/updated');

  // 4. Professional User
  const proEmail = 'professional@test.com';
  const hashedPro = await bcrypt.hash('Test@1234', 10);
  const professional = await prisma.user.upsert({
    where: { email: proEmail },
    update: { role: 'PROFESSIONAL' }, // Ensure role is correct
    create: {
      email: proEmail,
      password: hashedPro,
      role: 'PROFESSIONAL',
      firstName: 'Test',
      lastName: 'Professional',
      isVerified: true,
    }
  });

  const professionalProfileData = {
    headline: 'Senior Full Stack Developer',
    skills: ['Node.js', 'TypeScript', 'AWS'],
    extractedSkills: ['Node.js', 'TypeScript', 'AWS', 'Docker', 'React'],
    cvUrl: null,
    cvFileName: null,
  };

  await prisma.candidateProfile.upsert({
    where: { userId: professional.id },
    update: professionalProfileData,
    create: {
      userId: professional.id,
      ...professionalProfileData
    } as any
  });
  console.log('✅ Professional created/updated');

  // 5. Create test candidate profiles with UUIDs matching frontend mock data
  const testCandidates = [
    {
      id: "a1b2c3d4-e5f6-47a8-9b1c-2d3e4f5a6b7c",
      name: "Sachini Perera",
      email: "dehemimandalawattage@gmail.com",
      headline: "Frontend Developer",
      skills: ["React", "TypeScript", "Tailwind CSS", "Next.js"],
    },
    {
      id: "b2c3d4e5-f6a7-48b9-0c2d-3e4f5a6b7c8d",
      name: "Ravindu Jayasinghe",
      email: "ravindu.jayasinghe@test.com",
      headline: "Full Stack Engineer",
      skills: ["Node.js", "React", "PostgreSQL", "Docker"],
    },
  ];

  for (const candidate of testCandidates) {
    // Create a user for each candidate
    const candidateUser = await prisma.user.upsert({
      where: { email: candidate.email },
      update: { role: 'STUDENT' },
      create: {
        email: candidate.email,
        password: await bcrypt.hash('Test@1234', 10),
        role: 'STUDENT',
        firstName: candidate.name.split(' ')[0],
        lastName: candidate.name.split(' ')[1] || '',
        isVerified: true,
      }
    });

    // Create the candidate profile with the specified UUID
    await prisma.candidateProfile.upsert({
      where: { id: candidate.id },
      update: {
        headline: candidate.headline,
        skills: candidate.skills,
        extractedSkills: candidate.skills,
      },
      create: {
        id: candidate.id,
        userId: candidateUser.id,
        headline: candidate.headline,
        skills: candidate.skills,
        extractedSkills: candidate.skills,
        cvUrl: null,
        cvFileName: null,
      } as any
    });
  }
  console.log('✅ Test candidates seeded');

  // 6. Create applications linking test candidates to job posts
  const jobPostIds = [
    'fb7b1f1a-6d1a-4d7a-8d1a-6d1a4d7a8d1a', // Frontend Developer
    'cb7b1f1a-6d1a-4d7a-8d1a-6d1a4d7a8d1b', // Backend Developer
    'db7b1f1a-6d1a-4d7a-8d1a-6d1a4d7a8d1c', // UI/UX Designer
  ];

  // Link each candidate to each job post
  for (const candidate of testCandidates) {
    for (const jobPostId of jobPostIds) {
      await prisma.application.upsert({
        where: {
          candidateProfileId_jobPostId: {
            candidateProfileId: candidate.id,
            jobPostId,
          },
        },
        update: {
          applicationStatus: 'PENDING',
        },
        create: {
          candidateProfileId: candidate.id,
          jobPostId,
          cvUrl: 'https://example.com/cv.pdf',
          cvFileName: `${candidate.name.replace(' ', '_')}_CV.pdf`,
          coverLetter: `I am interested in applying for this position. I have experience with ${candidate.skills.join(', ')}.`,
          applicationStatus: 'PENDING',
          aiScore: Math.floor(Math.random() * 100),
        },
      });
    }
  }

  const studentProfile = await prisma.candidateProfile.findUnique({ where: { userId: student.id } });
  const professionalProfile = await prisma.candidateProfile.findUnique({ where: { userId: professional.id } });

  if (studentProfile) {
    await prisma.application.upsert({
      where: {
        candidateProfileId_jobPostId: {
          candidateProfileId: studentProfile.id,
          jobPostId: jobPostIds[0],
        },
      },
      update: {
        applicationStatus: 'PENDING',
      },
      create: {
        candidateProfileId: studentProfile.id,
        jobPostId: jobPostIds[0],
        cvUrl: 'https://example.com/cv.pdf',
        cvFileName: 'Student_CV.pdf',
        coverLetter: 'I am very interested in this role and would love to discuss my qualifications.',
        applicationStatus: 'PENDING',
        aiScore: Math.floor(Math.random() * 100),
      },
    });
  }

  if (professionalProfile) {
    await prisma.application.upsert({
      where: {
        candidateProfileId_jobPostId: {
          candidateProfileId: professionalProfile.id,
          jobPostId: jobPostIds[1],
        },
      },
      update: {
        applicationStatus: 'PENDING',
      },
      create: {
        candidateProfileId: professionalProfile.id,
        jobPostId: jobPostIds[1],
        cvUrl: 'https://example.com/cv.pdf',
        cvFileName: 'Professional_CV.pdf',
        coverLetter: 'I am excited to bring my experience to this position.',
        applicationStatus: 'PENDING',
        aiScore: Math.floor(Math.random() * 100),
      },
    });
  }

  console.log('✅ Test applications seeded');

  // 7. Seed application status history for the applications
  const seededApplications = await prisma.application.findMany({
    where: {
      candidateProfileId: {
        in: [
          ...testCandidates.map((candidate) => candidate.id),
          studentProfile?.id,
          professionalProfile?.id,
        ].filter(Boolean) as string[],
      },
      jobPostId: { in: jobPostIds },
    },
    select: {
      id: true,
      jobPostId: true,
    },
  });

  for (const application of seededApplications) {
    const createdAt = new Date();
    const firstDate = new Date(createdAt.getTime() - 1000 * 60 * 60 * 24 * 2);
    const secondDate = new Date(createdAt.getTime() - 1000 * 60 * 60 * 24);

    await prisma.applicationStatusHistory.upsert({
      where: { id: `${application.id}-history-1` },
      update: {},
      create: {
        id: `${application.id}-history-1`,
        applicationId: application.id,
        status: 'PENDING',
        changedAt: firstDate,
        note: 'Application submitted',
      },
    });

    await prisma.applicationStatusHistory.upsert({
      where: { id: `${application.id}-history-2` },
      update: {},
      create: {
        id: `${application.id}-history-2`,
        applicationId: application.id,
        status: 'REVIEWED',
        changedAt: secondDate,
        note: 'Application reviewed by recruiter',
      },
    });

    // Add a shortlisting update for the first job post only
    if (application.jobPostId === jobPostIds[0]) {
      await prisma.applicationStatusHistory.upsert({
        where: { id: `${application.id}-history-3` },
        update: {},
        create: {
          id: `${application.id}-history-3`,
          applicationId: application.id,
          status: 'SHORTLISTED',
          changedAt: createdAt,
          note: 'Shortlisted for interview',
        },
      });
    }
  }
  console.log('✅ Application status history seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });