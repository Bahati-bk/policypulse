import bcrypt from 'bcryptjs'
import { db } from './db'
import fs from 'fs'
import path from 'path'

const SECTORS = [
  'Tax', 'Employment', 'Business Licensing', 'Public Health',
  'Environment', 'Data Protection', 'Technology', 'Education',
  'Healthcare', 'Transport', 'Finance', 'Trade', 'Agriculture'
]

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function seedDatabase() {
  console.log('Seeding database...')

  const adminPw = await bcrypt.hash('password123', 10)
  const userPw = await bcrypt.hash('password123', 10)

  const admin = await db.user.upsert({
    where: { email: 'admin@policypulse.ug' },
    update: {},
    create: {
      email: 'admin@policypulse.ug',
      name: 'Admin User',
      passwordHash: adminPw,
      role: 'ADMIN',
    },
  })

  const regularUser = await db.user.upsert({
    where: { email: 'user@policypulse.ug' },
    update: {},
    create: {
      email: 'user@policypulse.ug',
      name: 'Regular User',
      passwordHash: userPw,
      role: 'USER',
    },
  })

  await db.userProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      jurisdiction: 'Uganda',
      businessType: 'Government',
      employmentStatus: 'Employed',
      interests: JSON.stringify(['policy-analysis', 'regulation-tracking']),
    },
  })

  await db.userProfile.upsert({
    where: { userId: regularUser.id },
    update: {},
    create: {
      userId: regularUser.id,
      jurisdiction: 'Uganda',
      businessType: 'SME',
      employmentStatus: 'Self-Employed',
      interests: JSON.stringify(['tax-policy', 'business-licensing']),
    },
  })

  const sectorRecords: Array<{ id: string }> = []
  for (const name of SECTORS) {
    const s = await db.sector.upsert({
      where: { name },
      update: {},
      create: { name, slug: slug(name), description: `${name} sector policies and regulations` },
    })
    sectorRecords.push(s)
  }

  await db.userSector.upsert({
    where: { userId_sectorId: { userId: regularUser.id, sectorId: sectorRecords[0].id } },
    update: {},
    create: { userId: regularUser.id, sectorId: sectorRecords[0].id },
  })
  await db.userSector.upsert({
    where: { userId_sectorId: { userId: regularUser.id, sectorId: sectorRecords[2].id } },
    update: {},
    create: { userId: regularUser.id, sectorId: sectorRecords[2].id },
  })

  // ---- Categories ----
  const catTax = await db.policyCategory.upsert({
    where: { name: 'Tax Policy' },
    update: {},
    create: { name: 'Tax Policy', slug: 'tax-policy', description: 'Taxation policies and amendments' },
  })
  const catEmployment = await db.policyCategory.upsert({
    where: { name: 'Employment Law' },
    update: {},
    create: { name: 'Employment Law', slug: 'employment-law', description: 'Employment and labor regulations' },
  })
  const catDataProtection = await db.policyCategory.upsert({
    where: { name: 'Data Protection' },
    update: {},
    create: { name: 'Data Protection', slug: 'data-protection', description: 'Data protection and privacy regulations' },
  })
  const catEnvironment = await db.policyCategory.upsert({
    where: { name: 'Environment' },
    update: {},
    create: { name: 'Environment', slug: 'environment', description: 'Environmental protection and natural resource management' },
  })
  const catFinance = await db.policyCategory.upsert({
    where: { name: 'Financial Services' },
    update: {},
    create: { name: 'Financial Services', slug: 'financial-services', description: 'Banking, capital markets, and financial regulation' },
  })
  const catHealth = await db.policyCategory.upsert({
    where: { name: 'Public Health' },
    update: {},
    create: { name: 'Public Health', slug: 'public-health', description: 'Healthcare, pharmaceutical, and public health regulations' },
  })
  const catTechnology = await db.policyCategory.upsert({
    where: { name: 'Technology & Digital' },
    update: {},
    create: { name: 'Technology & Digital', slug: 'technology-digital', description: 'ICT, electronic transactions, and digital economy regulations' },
  })
  const catTrade = await db.policyCategory.upsert({
    where: { name: 'Trade & Investment' },
    update: {},
    create: { name: 'Trade & Investment', slug: 'trade-investment', description: 'Trade policy, investment regulations, and free zones' },
  })
  const catGovernance = await db.policyCategory.upsert({
    where: { name: 'Governance & Anti-Corruption' },
    update: {},
    create: { name: 'Governance & Anti-Corruption', slug: 'governance-anti-corruption', description: 'Public accountability, leadership code, and anti-corruption laws' },
  })
  const catEducation = await db.policyCategory.upsert({
    where: { name: 'Education' },
    update: {},
    create: { name: 'Education', slug: 'education', description: 'Education policy and regulations' },
  })
  const catAgriculture = await db.policyCategory.upsert({
    where: { name: 'Agriculture' },
    update: {},
    create: { name: 'Agriculture', slug: 'agriculture', description: 'Agricultural policy and food security regulations' },
  })
  const catHumanRights = await db.policyCategory.upsert({
    where: { name: 'Human Rights' },
    update: {},
    create: { name: 'Human Rights', slug: 'human-rights', description: 'Human rights, equality, and constitutional protections' },
  })

  // ---- Seed 20+ Real Ugandan Policies/Laws ----
  const ugandanPolicies = [
    {
      id: 'policy-income-tax',
      title: 'Income Tax Act (Cap. 340)',
      description: 'Provides for the imposition of income tax on income of persons and companies in Uganda, including withholding tax provisions.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catTax.id,
      effectiveDate: new Date('1997-07-01'), sourceUrl: 'https://ulii.org/akn/ug/act/1997/11/eng@2024-12-23',
    },
    {
      id: 'policy-vat',
      title: 'Value Added Tax Act (Cap. 349)',
      description: 'Imposes value added tax on supplies of goods and services made in Uganda and on imports into Uganda.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catTax.id,
      effectiveDate: new Date('2014-09-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2014/14',
    },
    {
      id: 'policy-data-protection',
      title: 'Data Protection and Privacy Act, 2019',
      description: 'Establishes the legal framework for the protection of personal data and regulates the collection, processing, and sharing of personal information.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catDataProtection.id,
      effectiveDate: new Date('2019-03-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2019/11',
    },
    {
      id: 'policy-employment',
      title: 'Employment Act, 2006',
      description: 'Consolidates the law relating to employment, regulation of terms and conditions of employment, and protection of workers in Uganda.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catEmployment.id,
      effectiveDate: new Date('2006-06-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2006/6',
    },
    {
      id: 'policy-nema',
      title: 'National Environment Act, 2019',
      description: 'Repeals and replaces the National Environment Statute 1995. Provides for sustainable management of the environment, establishment of NEMA, and environmental impact assessments. First African law to recognize rights of Nature.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catEnvironment.id,
      effectiveDate: new Date('2019-05-16'), sourceUrl: 'https://ulii.org/akn/ug/act/2019/5/eng@2019-05-16',
    },
    {
      id: 'policy-fia',
      title: 'Financial Institutions Act, 2004 (Amended 2016)',
      description: 'Regulates financial institutions including banks, credit institutions, and microfinance deposit-taking institutions in Uganda.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catFinance.id,
      effectiveDate: new Date('2004-12-31'), sourceUrl: 'https://ulii.org/akn/ug/act/2004/13',
    },
    {
      id: 'policy-cma',
      title: 'Capital Markets Authority Act, 1996',
      description: 'Establishes the Capital Markets Authority and provides for the development and regulation of capital markets in Uganda.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catFinance.id,
      effectiveDate: new Date('1996-01-01'), sourceUrl: 'https://ulii.org/akn/ug/act/1996/4',
    },
    {
      id: 'policy-public-health',
      title: 'Public Health Act, 2019',
      description: 'Provides for public health, prevention of diseases, and the promotion of health services delivery in Uganda.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catHealth.id,
      effectiveDate: new Date('2019-05-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2019/15',
    },
    {
      id: 'policy-eta',
      title: 'Electronic Transactions Act, 2011',
      description: 'Provides for the legal recognition of electronic transactions, electronic signatures, and the regulation of electronic commerce in Uganda.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catTechnology.id,
      effectiveDate: new Date('2011-12-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2011/9',
    },
    {
      id: 'policy-computer-misuse',
      title: 'Computer Misuse Act, 2011',
      description: 'Makes provision for the safety and security of electronic transactions and information systems, and provides for offenses relating to computers.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catTechnology.id,
      effectiveDate: new Date('2011-12-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2011/8',
    },
    {
      id: 'policy-free-zones',
      title: 'Uganda Free Zones Act, 2014',
      description: 'Provides for the establishment, development, and management of free zones for the promotion of export-oriented investment and economic growth.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catTrade.id,
      effectiveDate: new Date('2014-07-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2014/12',
    },
    {
      id: 'policy-uci',
      title: 'Uganda Citizenship and Immigration Act, 2009',
      description: 'Consolidates the law relating to citizenship, immigration, and the control of foreigners in Uganda.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catGovernance.id,
      effectiveDate: new Date('2009-07-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2009/9',
    },
    {
      id: 'policy-anti-corruption',
      title: 'Anti-Corruption Act, 2009 (Amended 2015)',
      description: 'Provides for the prevention, detection, investigation, and punishment of corruption, and for other related matters.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catGovernance.id,
      effectiveDate: new Date('2009-04-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2009/6',
    },
    {
      id: 'policy-aml',
      title: 'Anti-Money Laundering Act, 2013 (Amended 2017)',
      description: 'Provides for offenses relating to money laundering and financing of terrorism, and establishes the Financial Intelligence Authority.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catFinance.id,
      effectiveDate: new Date('2013-10-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2013/13',
    },
    {
      id: 'policy-uaa',
      title: 'Uganda Wildlife Act, 2019',
      description: 'Provides for the conservation and sustainable management of wildlife and to give effect to relevant international conventions.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catEnvironment.id,
      effectiveDate: new Date('2019-05-17'), sourceUrl: 'https://ulii.org/akn/ug/act/2019/13',
    },
    {
      id: 'policy-land',
      title: 'Land Act, 1998 (Amended 2010)',
      description: 'Provides for the tenure, ownership and management of land, and to amend and consolidate the law relating to tenure, ownership and management of land in Uganda.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catGovernance.id,
      effectiveDate: new Date('1998-07-02'), sourceUrl: 'https://ulii.org/akn/ug/act/1998/16',
    },
    {
      id: 'policy-education-act',
      title: 'Education Act, 2008',
      description: 'Provides for a functions and responsibilities of persons and institutions in education at all levels, and to make provision for the regulation and continuous quality improvement of education.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catEducation.id,
      effectiveDate: new Date('2008-09-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2008/12',
    },
    {
      id: 'policy-pfma',
      title: 'Public Finance Management Act, 2015 (Amended 2021)',
      description: 'Provides for the management of public finances and the prudent use of resources, and for related matters.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catFinance.id,
      effectiveDate: new Date('2015-07-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2015/12',
    },
    {
      id: 'policy-uaea',
      title: 'Uganda Atomic Energy Act, 2008',
      description: 'Provides for the peaceful application of atomic energy, establishment of the Atomic Energy Council, and radiation protection.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catHealth.id,
      effectiveDate: new Date('2008-11-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2008/11',
    },
    {
      id: 'policy-nds',
      title: 'National Development Plan III (2020/21–2024/25)',
      description: 'Uganda\'s medium-term development blueprint focused on sustainable economic growth, job creation, and inclusive development.',
      policyType: 'POLICY', jurisdiction: 'Uganda',
      issuingAuthority: 'National Planning Authority', categoryId: catGovernance.id,
      effectiveDate: new Date('2020-06-01'), sourceUrl: 'https://npa.go.ug/ndp-iii',
    },
    {
      id: 'policy-pdm',
      title: 'Parliamentary Democracy Act (Amendment), 2025',
      description: 'Amendment to strengthen parliamentary oversight functions and democratic governance.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catGovernance.id,
      effectiveDate: new Date('2025-01-01'), sourceUrl: 'https://ulii.org',
    },
    {
      id: 'policy-digital-tax',
      title: 'Digital Services Tax Regulations, 2024',
      description: 'Imposes tax on digital services provided by non-resident persons to users in Uganda, including online advertising and streaming services.',
      policyType: 'REGULATION', jurisdiction: 'Uganda',
      issuingAuthority: 'Uganda Revenue Authority', categoryId: catTax.id,
      effectiveDate: new Date('2024-07-01'), sourceUrl: 'https://ura.go.ug',
    },
    {
      id: 'policy-ndpe',
      title: 'National Data Protection and Privacy (Electronic Communications) Regulations, 2023',
      description: 'Regulates data protection in the electronic communications sector, including requirements for telecom service providers.',
      policyType: 'REGULATION', jurisdiction: 'Uganda',
      issuingAuthority: 'National Information Technology Authority', categoryId: catDataProtection.id,
      effectiveDate: new Date('2023-09-01'), sourceUrl: 'https://nita.go.ug',
    },
    {
      id: 'policy-osc',
      title: 'Online Substances Control Guidelines, 2024',
      description: 'Guidelines for controlling the online sale and distribution of regulated substances including pharmaceuticals and psychotropic substances.',
      policyType: 'GUIDELINE', jurisdiction: 'Uganda',
      issuingAuthority: 'Ministry of Health', categoryId: catHealth.id,
      effectiveDate: new Date('2024-03-01'), sourceUrl: 'https://health.go.ug',
    },
    {
      id: 'policy-ndc',
      title: 'National Climate Change Act, 2021',
      description: 'Provides for a framework for climate change response actions, the establishment of the National Climate Change Council, and related matters.',
      policyType: 'ACT', jurisdiction: 'Uganda',
      issuingAuthority: 'Parliament of Uganda', categoryId: catEnvironment.id,
      effectiveDate: new Date('2021-07-01'), sourceUrl: 'https://ulii.org/akn/ug/act/2021/2',
    },
  ]

  for (const p of ugandanPolicies) {
    await db.policy.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    })
  }
  console.log(`Seeded ${ugandanPolicies.length} Ugandan policies`)

  await db.subscription.upsert({
    where: { id: `sub-${regularUser.id.slice(0, 10)}-cat-${catTax.id.slice(0, 10)}` },
    update: {},
    create: {
      userId: regularUser.id,
      subscriptionType: 'CATEGORY',
      referenceId: catTax.id,
    },
  })

  // Create sample policy documents
  const uploadDir = '/home/z/my-project/upload'
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  // Income Tax Amendment - use already-seeded policy
  const policy1 = await db.policy.findUniqueOrThrow({ where: { id: 'policy-income-tax' } })
  const policy2 = await db.policy.findUniqueOrThrow({ where: { id: 'policy-data-protection' } })
  const policy3 = await db.policy.findUniqueOrThrow({ where: { id: 'policy-employment' } })

  const oldText1 = `INCOME TAX ACT (CHAPTER 340)

PART VI - WITHHOLDING TAX

Section 118: Withholding tax on payments to residents
(1) Every person who makes a payment of a specified nature to a resident shall withhold tax at the rate of six percent of the gross amount of the payment.
(2) The specified payments include: management fees, professional fees, royalties, dividends, interest, and commissions.
(3) The tax withheld under this section shall be remitted to the Commissioner within fifteen days after the end of the month in which the withholding occurred.
(4) Any person who fails to withhold tax as required shall be liable to pay the tax and a penalty equal to the amount of tax not withheld.`

  const newText1 = `INCOME TAX ACT (CHAPTER 340)

PART VI - WITHHOLDING TAX

Section 118: Withholding tax on payments to residents
(1) Every person who makes a payment of a specified nature to a resident shall withhold tax at the rate of five percent of the gross amount of the payment.
(2) The specified payments include: management fees, professional fees, royalties, dividends, interest, commissions, and digital service fees.
(3) The tax withheld under this section shall be remitted to the Commissioner within seven days after the end of the month in which the withholding occurred.
(4) Any person who fails to withhold tax as required shall be liable to pay the tax and a penalty equal to twice the amount of tax not withheld.
(5) Small businesses with annual turnover below fifty million Uganda Shillings are exempt from withholding tax obligations under this section.`

  const oldDoc1Path = path.join(uploadDir, 'income-tax-act-v1.txt')
  fs.writeFileSync(oldDoc1Path, oldText1)

  const newDoc1Path = path.join(uploadDir, 'income-tax-act-v2.txt')
  fs.writeFileSync(newDoc1Path, newText1)

  const oldDoc1 = await db.policyDocument.upsert({
    where: { id: 'doc-income-tax-v1' },
    update: {},
    create: {
      id: 'doc-income-tax-v1',
      policyId: policy1.id,
      version: '2023-Original',
      documentType: 'TXT',
      storageKey: 'income-tax-act-v1.txt',
      fileName: 'income-tax-act-v1.txt',
      processingStatus: 'READY',
      extractedText: oldText1,
      publicationDate: new Date('2023-07-01'),
      effectiveDate: new Date('2023-07-01'),
    },
  })

  const newDoc1 = await db.policyDocument.upsert({
    where: { id: 'doc-income-tax-v2' },
    update: {},
    create: {
      id: 'doc-income-tax-v2',
      policyId: policy1.id,
      version: '2024-Amendment',
      documentType: 'TXT',
      storageKey: 'income-tax-act-v2.txt',
      fileName: 'income-tax-act-v2.txt',
      processingStatus: 'READY',
      extractedText: newText1,
      publicationDate: new Date('2024-06-15'),
      effectiveDate: new Date('2024-07-01'),
    },
  })

  
  const oldText2 = `DATA PROTECTION AND PRIVACY ACT

Section 23: Registration of Data Controllers
(1) Every data controller shall register with the National Data Protection Authority within ninety days of commencement of operations.
(2) The registration shall include the categories of personal data processed, the purposes of processing, and the data subjects affected.
(3) Annual renewal of registration is required.`

  const newText2 = `DATA PROTECTION AND PRIVACY ACT

Section 23: Registration of Data Controllers
(1) Every data controller shall register with the National Data Protection Authority within sixty days of commencement of operations.
(2) The registration shall include the categories of personal data processed, the purposes of processing, the data subjects affected, and a data protection impact assessment.
(3) Annual renewal of registration is required, accompanied by a compliance report.
(4) Data controllers processing personal data of more than one thousand data subjects shall appoint a Data Protection Officer.`

  fs.writeFileSync(path.join(uploadDir, 'data-protection-v1.txt'), oldText2)
  fs.writeFileSync(path.join(uploadDir, 'data-protection-v2.txt'), newText2)

  await db.policyDocument.upsert({
    where: { id: 'doc-data-protection-v1' },
    update: {},
    create: {
      id: 'doc-data-protection-v1',
      policyId: policy2.id,
      version: '2022-Original',
      documentType: 'TXT',
      storageKey: 'data-protection-v1.txt',
      fileName: 'data-protection-v1.txt',
      processingStatus: 'READY',
      extractedText: oldText2,
      publicationDate: new Date('2022-01-15'),
    },
  })

  await db.policyDocument.upsert({
    where: { id: 'doc-data-protection-v2' },
    update: {},
    create: {
      id: 'doc-data-protection-v2',
      policyId: policy2.id,
      version: '2024-Amendment',
      documentType: 'TXT',
      storageKey: 'data-protection-v2.txt',
      fileName: 'data-protection-v2.txt',
      processingStatus: 'READY',
      extractedText: newText2,
      publicationDate: new Date('2024-03-20'),
    },
  })

  
  const oldText3 = `EMPLOYMENT REGULATIONS

Section 8: Minimum Wage
(1) The minimum wage for all workers in Uganda shall be set at one hundred thousand Uganda Shillings per month.
(2) The minimum wage shall be reviewed every three years.`

  fs.writeFileSync(path.join(uploadDir, 'employment-reg-v1.txt'), oldText3)

  await db.policyDocument.upsert({
    where: { id: 'doc-employment-v1' },
    update: {},
    create: {
      id: 'doc-employment-v1',
      policyId: policy3.id,
      version: '2021-Original',
      documentType: 'TXT',
      storageKey: 'employment-reg-v1.txt',
      fileName: 'employment-reg-v1.txt',
      processingStatus: 'READY',
      extractedText: oldText3,
      publicationDate: new Date('2021-06-01'),
    },
  })

  // Create comparison for first policy
  const comparison = await db.documentComparison.upsert({
    where: { id: 'comparison-income-tax' },
    update: {},
    create: {
      id: 'comparison-income-tax',
      oldDocumentId: oldDoc1.id,
      newDocumentId: newDoc1.id,
      status: 'COMPLETED',
      createdBy: admin.id,
      completedAt: new Date(),
    },
  })

  // Create sample changes for the comparison (use upsert with deterministic IDs)
  const change1 = await db.policyChange.upsert({
    where: { id: 'change-wht-rate' },
    update: {},
    create: {
      id: 'change-wht-rate',
      comparisonId: comparison.id,
      changeType: 'MODIFIED',
      title: 'Withholding tax rate reduced from 6% to 5%',
      description: 'The withholding tax rate on payments to residents has been reduced from 6% to 5% of the gross amount.',
      oldText: 'shall withhold tax at the rate of six percent',
      newText: 'shall withhold tax at the rate of five percent',
      severity: 'MEDIUM',
      confidenceScore: 0.95,
    },
  })

  const change2 = await db.policyChange.upsert({
    where: { id: 'change-digital-fees' },
    update: {},
    create: {
      id: 'change-digital-fees',
      comparisonId: comparison.id,
      changeType: 'ADDED',
      title: 'Digital service fees included in specified payments',
      description: 'Digital service fees have been added to the list of specified payments subject to withholding tax.',
      oldText: 'management fees, professional fees, royalties, dividends, interest, and commissions',
      newText: 'management fees, professional fees, royalties, dividends, interest, commissions, and digital service fees',
      severity: 'HIGH',
      confidenceScore: 0.92,
    },
  })

  const change3 = await db.policyChange.upsert({
    where: { id: 'change-remittance-deadline' },
    update: {},
    create: {
      id: 'change-remittance-deadline',
      comparisonId: comparison.id,
      changeType: 'MODIFIED',
      title: 'Remittance deadline shortened from 15 to 7 days',
      description: 'The deadline for remitting withheld tax has been reduced from 15 days to 7 days after month-end.',
      oldText: 'within fifteen days after the end of the month',
      newText: 'within seven days after the end of the month',
      severity: 'HIGH',
      confidenceScore: 0.98,
    },
  })

  const change4 = await db.policyChange.upsert({
    where: { id: 'change-penalty-increase' },
    update: {},
    create: {
      id: 'change-penalty-increase',
      comparisonId: comparison.id,
      changeType: 'MODIFIED',
      title: 'Penalty for non-compliance increased',
      description: 'The penalty for failing to withhold tax has been increased from equal to double the tax amount not withheld.',
      oldText: 'a penalty equal to the amount of tax not withheld',
      newText: 'a penalty equal to twice the amount of tax not withheld',
      severity: 'HIGH',
      confidenceScore: 0.96,
    },
  })

  const change5 = await db.policyChange.upsert({
    where: { id: 'change-sme-exemption' },
    update: {},
    create: {
      id: 'change-sme-exemption',
      comparisonId: comparison.id,
      changeType: 'ADDED',
      title: 'New small business exemption for withholding tax',
      description: 'Small businesses with annual turnover below UGX 50 million are now exempt from withholding tax obligations.',
      newText: 'Small businesses with annual turnover below fifty million Uganda Shillings are exempt from withholding tax obligations under this section.',
      severity: 'MEDIUM',
      confidenceScore: 0.9,
    },
  })

  // Create impact assessments (upsert)
  await db.impactAssessment.upsert({
    where: { changeId: change2.id },
    update: {},
    create: {
      changeId: change2.id,
      severity: 'HIGH',
      rationale: 'Digital service fees being added to withholding tax obligations affects all businesses providing or receiving digital services. This is a significant expansion of the tax base.',
      actionRequired: true,
      deadline: '2024-07-01',
      confidenceScore: 0.92,
      affectedGroups: JSON.stringify([
        { group: 'Digital Service Providers', confidence: 0.95, impact: 'Direct financial impact - must withhold tax on digital service fee payments' },
        { group: 'E-commerce Businesses', confidence: 0.88, impact: 'Indirect impact through supply chain' },
        { group: 'Tech Startups', confidence: 0.85, impact: 'Increased compliance burden for small digital businesses' },
      ]),
      actions: JSON.stringify([
        { action: 'Review all digital service fee payments and ensure withholding tax compliance', priority: 'HIGH', deadline: '2024-07-01' },
        { action: 'Update accounting systems to handle new withholding tax category', priority: 'HIGH', deadline: '2024-06-25' },
        { action: 'Notify finance team of new obligations', priority: 'MEDIUM', deadline: '2024-06-20' },
      ]),
    },
  })

  // Create alert for change2
  const alert = await db.alert.upsert({
    where: { id: 'alert-digital-wht' },
    update: {},
    create: {
      id: 'alert-digital-wht',
      changeId: change2.id,
      title: 'NEW: Digital Service Fees Now Subject to Withholding Tax',
      summary: 'The 2024 Income Tax Amendment adds digital service fees to the list of payments subject to 5% withholding tax. This affects businesses providing digital platforms, e-commerce services, and online marketplaces.',
      whatChanged: 'Digital service fees have been added to Section 118 of the Income Tax Act as a new category of payments subject to withholding tax at 5%.',
      whoIsAffected: 'Digital service providers, e-commerce platforms, online marketplace operators, fintech companies, and any business receiving or making payments for digital services.',
      whatToDo: '1. Identify all digital service fee payments in your operations. 2. Implement withholding procedures for these payments. 3. Update accounting and reporting systems. 4. Ensure compliance before the effective date of July 1, 2024.',
      status: 'PENDING_REVIEW',
    },
  })

  // Create a second alert for the penalty change
  await db.alert.upsert({
    where: { id: 'alert-penalty-increase' },
    update: {},
    create: {
      id: 'alert-penalty-increase',
      changeId: change4.id,
      title: 'WARNING: Withholding Tax Penalty Doubled',
      summary: 'Penalties for failing to withhold tax have increased from 1x to 2x the tax amount not withheld. Ensure your compliance processes are robust.',
      whatChanged: 'The penalty for non-compliance with withholding tax obligations under Section 118 has been doubled.',
      whoIsAffected: 'All businesses and individuals responsible for withholding tax on payments to residents.',
      whatToDo: 'Review and strengthen your withholding tax compliance procedures immediately.',
      status: 'DRAFT',
    },
  })

  // Create notifications for regular user (upsert with deterministic IDs)
  await db.userNotification.upsert({
    where: { id: 'notif-digital-fees' },
    update: {},
    create: {
      id: 'notif-digital-fees',
      userId: regularUser.id,
      alertId: alert.id,
      title: 'New Tax Policy Change: Digital Service Fees',
      message: 'A significant change has been detected in the Income Tax Act affecting digital service fee payments. Click to view details.',
      channel: 'WEB',
      status: 'UNREAD',
      sentAt: new Date(),
    },
  })

  await db.userNotification.upsert({
    where: { id: 'notif-penalty-increase' },
    update: {},
    create: {
      id: 'notif-penalty-increase',
      userId: regularUser.id,
      alertId: alert.id,
      title: 'Penalty Increase for Tax Non-Compliance',
      message: 'Withholding tax penalties have been doubled. Review your compliance procedures.',
      channel: 'WEB',
      status: 'UNREAD',
      sentAt: new Date(),
    },
  })

  // Create source references (upsert)
  await db.sourceReference.upsert({
    where: { id: 'src-ref-digital-fees' },
    update: {},
    create: {
      id: 'src-ref-digital-fees',
      changeId: change2.id,
      sectionTitle: 'Section 118(2)',
      quotedText: 'management fees, professional fees, royalties, dividends, interest, commissions, and digital service fees',
    },
  })

  // Create audit logs (delete old seed logs first to avoid duplicates)
  await db.auditLog.deleteMany({
    where: { action: 'SEED' },
  })
  await db.auditLog.createMany({
    data: [
      { actorUserId: admin.id, action: 'SEED', entityType: 'System', entityId: 'seed', metadata: JSON.stringify({ message: 'Database seeded with initial data' }) },
      { actorUserId: admin.id, action: 'CREATE', entityType: 'PolicyDocument', entityId: oldDoc1.id, metadata: JSON.stringify({ title: 'Income Tax Act v1' }) },
      { actorUserId: admin.id, action: 'CREATE', entityType: 'PolicyDocument', entityId: newDoc1.id, metadata: JSON.stringify({ title: 'Income Tax Act v2' }) },
      { actorUserId: admin.id, action: 'CREATE', entityType: 'DocumentComparison', entityId: comparison.id, metadata: JSON.stringify({ policy: 'Income Tax Act' }) },
      { actorUserId: admin.id, action: 'ANALYZE', entityType: 'DocumentComparison', entityId: comparison.id, metadata: JSON.stringify({ changesFound: 5 }) },
      { actorUserId: admin.id, action: 'CREATE', entityType: 'Alert', entityId: alert.id, metadata: JSON.stringify({ title: 'Digital Service Fees WHT' }) },
      { actorUserId: regularUser.id, action: 'LOGIN', entityType: 'User', entityId: regularUser.id },
      { actorUserId: regularUser.id, action: 'VIEW', entityType: 'Alert', entityId: alert.id },
      { actorUserId: admin.id, action: 'UPDATE', entityType: 'Alert', entityId: alert.id, metadata: JSON.stringify({ status: 'PENDING_REVIEW' }) },
      { actorUserId: admin.id, action: 'SEND', entityType: 'Notification', entityId: regularUser.id, metadata: JSON.stringify({ alertCount: 2 }) },
    ],
  })

  // Create an AI analysis run record (upsert)
  await db.aIAnalysisRun.upsert({
    where: { id: 'ai-run-income-tax' },
    update: {},
    create: {
      comparisonId: comparison.id,
      provider: 'z-ai-sdk',
      model: 'default',
      status: 'COMPLETED',
      confidenceScore: 0.93,
      output: JSON.stringify({
        analysis: '5 changes detected in Income Tax Amendment Act 2024',
        highSeverity: 3,
        mediumSeverity: 2,
      }),
      completedAt: new Date(),
    },
  })

  console.log('Seed completed successfully!')
  return { admin, regularUser, policies: [policy1, policy2, policy3], comparison, alert }
}
