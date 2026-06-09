import type { ControlTitle, Medication } from './types'

const dailyMed = {
  name: 'DailyMed / FDA labeling',
  url: 'https://dailymed.nlm.nih.gov/dailymed/',
}

const deaSchedules = {
  name: 'DEA drug scheduling references',
  url: 'https://www.dea.gov/drug-information/drug-scheduling',
}

type MedicationSeed = {
  brandName: string
  genericName: string
  indication: string
  control: ControlTitle
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const seeds: MedicationSeed[] = [
  { brandName: 'Lipitor', genericName: 'atorvastatin', indication: 'Hyperlipidemia', control: 'Rx' },
  { brandName: 'Crestor', genericName: 'rosuvastatin', indication: 'Hyperlipidemia', control: 'Rx' },
  { brandName: 'Zocor', genericName: 'simvastatin', indication: 'Hyperlipidemia', control: 'Rx' },
  { brandName: 'Norvasc', genericName: 'amlodipine', indication: 'Hypertension', control: 'Rx' },
  { brandName: 'Zestril', genericName: 'lisinopril', indication: 'Hypertension', control: 'Rx' },
  { brandName: 'Cozaar', genericName: 'losartan', indication: 'Hypertension', control: 'Rx' },
  { brandName: 'Toprol XL', genericName: 'metoprolol succinate', indication: 'Hypertension', control: 'Rx' },
  { brandName: 'Coreg', genericName: 'carvedilol', indication: 'Heart failure', control: 'Rx' },
  { brandName: 'HydroDIURIL', genericName: 'hydrochlorothiazide', indication: 'Hypertension', control: 'Rx' },
  { brandName: 'Lasix', genericName: 'furosemide', indication: 'Edema', control: 'Rx' },
  { brandName: 'Glucophage', genericName: 'metformin', indication: 'Type 2 diabetes', control: 'Rx' },
  { brandName: 'Jardiance', genericName: 'empagliflozin', indication: 'Type 2 diabetes', control: 'Rx' },
  { brandName: 'Farxiga', genericName: 'dapagliflozin', indication: 'Type 2 diabetes', control: 'Rx' },
  { brandName: 'Januvia', genericName: 'sitagliptin', indication: 'Type 2 diabetes', control: 'Rx' },
  { brandName: 'Ozempic', genericName: 'semaglutide', indication: 'Type 2 diabetes', control: 'Rx' },
  { brandName: 'Synthroid', genericName: 'levothyroxine', indication: 'Hypothyroidism', control: 'Rx' },
  { brandName: 'Prilosec', genericName: 'omeprazole', indication: 'GERD', control: 'Rx' },
  { brandName: 'Protonix', genericName: 'pantoprazole', indication: 'GERD', control: 'Rx' },
  { brandName: 'Zofran', genericName: 'ondansetron', indication: 'Nausea and vomiting', control: 'Rx' },
  { brandName: 'Singulair', genericName: 'montelukast', indication: 'Asthma and allergic rhinitis', control: 'Rx' },
  { brandName: 'ProAir HFA', genericName: 'albuterol', indication: 'Bronchospasm', control: 'Rx' },
  { brandName: 'Advair', genericName: 'fluticasone and salmeterol', indication: 'Asthma and COPD', control: 'Rx' },
  { brandName: 'Spiriva', genericName: 'tiotropium', indication: 'COPD', control: 'Rx' },
  { brandName: 'Zoloft', genericName: 'sertraline', indication: 'Depression', control: 'Rx' },
  { brandName: 'Lexapro', genericName: 'escitalopram', indication: 'Depression', control: 'Rx' },
  { brandName: 'Prozac', genericName: 'fluoxetine', indication: 'Depression', control: 'Rx' },
  { brandName: 'Cymbalta', genericName: 'duloxetine', indication: 'Depression', control: 'Rx' },
  { brandName: 'Wellbutrin', genericName: 'bupropion', indication: 'Depression', control: 'Rx' },
  { brandName: 'Seroquel', genericName: 'quetiapine', indication: 'Bipolar disorder', control: 'Rx' },
  { brandName: 'Abilify', genericName: 'aripiprazole', indication: 'Schizophrenia', control: 'Rx' },
  { brandName: 'Neurontin', genericName: 'gabapentin', indication: 'Seizures', control: 'Rx' },
  { brandName: 'Lyrica', genericName: 'pregabalin', indication: 'Neuropathic pain', control: 'C-V' },
  { brandName: 'Imitrex', genericName: 'sumatriptan', indication: 'Migraine', control: 'Rx' },
  { brandName: 'Maxalt', genericName: 'rizatriptan', indication: 'Migraine', control: 'Rx' },
  { brandName: 'Flomax', genericName: 'tamsulosin', indication: 'Benign prostatic hyperplasia', control: 'Rx' },
  { brandName: 'Proscar', genericName: 'finasteride', indication: 'Benign prostatic hyperplasia', control: 'Rx' },
  { brandName: 'Detrol', genericName: 'tolterodine', indication: 'Overactive bladder', control: 'Rx' },
  { brandName: 'Eliquis', genericName: 'apixaban', indication: 'Anticoagulation', control: 'Rx' },
  { brandName: 'Xarelto', genericName: 'rivaroxaban', indication: 'Anticoagulation', control: 'Rx' },
  { brandName: 'Plavix', genericName: 'clopidogrel', indication: 'Antiplatelet therapy', control: 'Rx' },
  { brandName: 'Coumadin', genericName: 'warfarin', indication: 'Anticoagulation', control: 'Rx' },
  { brandName: 'Amoxil', genericName: 'amoxicillin', indication: 'Bacterial infection', control: 'Rx' },
  { brandName: 'Augmentin', genericName: 'amoxicillin and clavulanate', indication: 'Bacterial infection', control: 'Rx' },
  { brandName: 'Zithromax', genericName: 'azithromycin', indication: 'Bacterial infection', control: 'Rx' },
  { brandName: 'Cipro', genericName: 'ciprofloxacin', indication: 'Bacterial infection', control: 'Rx' },
  { brandName: 'Bactrim', genericName: 'sulfamethoxazole and trimethoprim', indication: 'Bacterial infection', control: 'Rx' },
  { brandName: 'Diflucan', genericName: 'fluconazole', indication: 'Fungal infection', control: 'Rx' },
  { brandName: 'Valtrex', genericName: 'valacyclovir', indication: 'Herpes virus infection', control: 'Rx' },
  { brandName: 'Macrobid', genericName: 'nitrofurantoin', indication: 'Urinary tract infection', control: 'Rx' },
  { brandName: 'Adderall', genericName: 'amphetamine and dextroamphetamine', indication: 'ADHD', control: 'C-II' },
  { brandName: 'Vyvanse', genericName: 'lisdexamfetamine', indication: 'ADHD', control: 'C-II' },
  { brandName: 'Concerta', genericName: 'methylphenidate ER', indication: 'ADHD', control: 'C-II' },
  { brandName: 'Ritalin', genericName: 'methylphenidate', indication: 'ADHD', control: 'C-II' },
  { brandName: 'Norco', genericName: 'hydrocodone and acetaminophen', indication: 'Pain', control: 'C-II' },
  { brandName: 'Percocet', genericName: 'oxycodone and acetaminophen', indication: 'Pain', control: 'C-II' },
  { brandName: 'Suboxone', genericName: 'buprenorphine and naloxone', indication: 'Opioid use disorder', control: 'C-III' },
  { brandName: 'Tylenol with Codeine', genericName: 'acetaminophen and codeine', indication: 'Pain', control: 'C-III' },
  { brandName: 'Xanax', genericName: 'alprazolam', indication: 'Anxiety', control: 'C-IV' },
  { brandName: 'Ativan', genericName: 'lorazepam', indication: 'Anxiety', control: 'C-IV' },
  { brandName: 'Klonopin', genericName: 'clonazepam', indication: 'Seizures', control: 'C-IV' },
  { brandName: 'Valium', genericName: 'diazepam', indication: 'Anxiety', control: 'C-IV' },
  { brandName: 'Ambien', genericName: 'zolpidem', indication: 'Insomnia', control: 'C-IV' },
  { brandName: 'Ultram', genericName: 'tramadol', indication: 'Pain', control: 'C-IV' },
  { brandName: 'Lomotil', genericName: 'diphenoxylate and atropine', indication: 'Diarrhea', control: 'C-V' },
]

export const starterMedications: Medication[] = seeds.map((seed) => ({
  ...seed,
  id: `${slugify(seed.brandName)}-${slugify(seed.genericName)}`,
  reviewedAt: '2026-06-08',
  indicationSource: dailyMed,
  controlSource: deaSchedules,
}))
