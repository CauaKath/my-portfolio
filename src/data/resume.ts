import type { Locale } from '@/i18n'

// Hardcoded on purpose: a resume changes a few times a year, so it is not
// worth a database table or an editor. Edit this file and redeploy.

export interface IResumeJob {
  company: string
  role: string
  period: string
  location: string
  // Empty until enriched; the page hides the list when there is nothing in it.
  highlights: string[]
}

export interface IResumeEducation {
  institution: string
  course: string
  period: string
}

export interface IResume {
  name: string
  headline: string
  location: string
  summary: string
  contacts: { label: string; href: string; text: string }[]
  skills: string[]
  languages: { name: string; level: string }[]
  experience: IResumeJob[]
  education: IResumeEducation[]
  certifications: string[]
}

const en: IResume = {
  name: 'Cauã Guilherme Kath',
  headline: 'Mid-Level Back-end Developer | Node.js | Java | Golang',
  location: 'Jaraguá do Sul, Santa Catarina, Brazil',
  summary:
    "I'm a software developer and I really enjoy back-end work and systems architecture. These days I work mostly with Node.js, AWS and Serverless, but I also have experience with Java and Go. I recently finished my postgraduate degree in Software Engineering, and day to day I'm always looking to learn new things, improve my solutions and better understand the problems I'm helping to solve.",
  contacts: [
    { label: 'Email', href: 'mailto:cauakathdev@gmail.com', text: 'cauakathdev@gmail.com' },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/cauã-guilherme-kath-24982720b',
      text: 'linkedin.com/in/cauã-guilherme-kath',
    },
    { label: 'GitHub', href: 'https://github.com/cauakath', text: 'github.com/cauakath' },
  ],
  skills: ['Java', 'Go', 'Node.js', 'TypeScript', 'JavaScript', 'MySQL', 'Spring Framework', 'AWS', 'Serverless', 'Docker', 'Git'],
  languages: [
    { name: 'Portuguese', level: 'Native or bilingual' },
    { name: 'English', level: 'Professional working' },
  ],
  experience: [
    {
      company: 'Simplifica+',
      role: 'Software Developer',
      period: 'Sep 2022 – Present',
      location: 'Jaraguá do Sul, SC, Brazil',
      highlights: [],
    },
    {
      company: 'WEG',
      role: 'Systems Developer',
      period: 'Mar 2022 – Sep 2022',
      location: 'Jaraguá do Sul, SC, Brazil',
      highlights: [],
    },
    {
      company: 'WEG',
      role: 'Information Systems Programmer Apprentice',
      period: 'Feb 2020 – Mar 2022',
      location: 'Jaraguá do Sul, SC, Brazil',
      highlights: [
        'Full-time course in Information Systems Programming: Java, HTML 5, CSS 3, MySQL, JavaScript, TypeScript, Spring and ReactJS.',
      ],
    },
  ],
  education: [
    {
      institution: 'FIAP Pós Tech',
      course: 'Postgraduate Degree, Software Architecture',
      period: 'Feb 2025 – Mar 2026',
    },
    {
      institution: 'SENAI/SC',
      course: 'Technology Degree (CST), Information Technology',
      period: 'Aug 2022 – Dec 2024',
    },
    {
      institution: 'SENAI/SC',
      course: 'Full-time Information Systems Programmer course',
      period: 'Feb 2020 – Mar 2022',
    },
  ],
  certifications: ['Industrial Apprenticeship: Information Systems Programmer', 'Introduction to Agile Scrum'],
}

const ptBR: IResume = {
  name: 'Cauã Guilherme Kath',
  headline: 'Desenvolvedor Back-end Pleno | Node.js | Java | Golang',
  location: 'Jaraguá do Sul, Santa Catarina, Brasil',
  summary:
    'Sou desenvolvedor de software e gosto bastante de trabalhar com backend e arquitetura de sistemas. Hoje atuo principalmente com Node.js, AWS e Serverless, mas também tenho experiência com Java e Go. Recentemente concluí minha pós-graduação em Engenharia de Software e, no dia a dia, estou sempre buscando aprender coisas novas, melhorar minhas soluções e entender melhor os problemas que estou ajudando a resolver.',
  contacts: en.contacts,
  skills: en.skills,
  languages: [
    { name: 'Português', level: 'Nativo ou bilíngue' },
    { name: 'Inglês', level: 'Profissional' },
  ],
  experience: [
    {
      company: 'Simplifica+',
      role: 'Desenvolvedor de software',
      period: 'Set 2022 – Atual',
      location: 'Jaraguá do Sul, SC, Brasil',
      highlights: [],
    },
    {
      company: 'WEG',
      role: 'Desenvolvedor de sistemas',
      period: 'Mar 2022 – Set 2022',
      location: 'Jaraguá do Sul, SC, Brasil',
      highlights: [],
    },
    {
      company: 'WEG',
      role: 'Aprendiz de Programador de Sistemas de Informação',
      period: 'Fev 2020 – Mar 2022',
      location: 'Jaraguá do Sul, SC, Brasil',
      highlights: [
        'Curso em período integral de Programador de Sistemas de Informação: Java, HTML 5, CSS 3, MySQL, JavaScript, TypeScript, Spring e ReactJS.',
      ],
    },
  ],
  education: [
    {
      institution: 'FIAP Pós Tech',
      course: 'Pós-graduação, Software Architecture',
      period: 'Fev 2025 – Mar 2026',
    },
    {
      institution: 'SENAI/SC',
      course: 'Curso Superior de Tecnologia (CST), Tecnologia da Informação',
      period: 'Ago 2022 – Dez 2024',
    },
    {
      institution: 'SENAI/SC',
      course: 'Curso em período integral de Programador de Sistemas de Informação',
      period: 'Fev 2020 – Mar 2022',
    },
  ],
  certifications: [
    'Aprendizagem Industrial de Programador de Sistemas de Informação',
    'Introdução ao Agile Scrum',
  ],
}

export const resumes: Record<Locale, IResume> = { en, 'pt-BR': ptBR }
