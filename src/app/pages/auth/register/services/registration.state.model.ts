export type SelfServiceRegistrationRole =
  | 'portfolio_officer'
  | 'extension_officer'
  | 'bank'
  | 'input_provider';

export type ProviderServiceType =
  | 'tractor_services'
  | 'irrigation_services'
  | 'agrochemicals'
  | 'soil_testing'
  | 'logistics_aggregation';

export interface OfficerPersonalInformation {
  fullName: string;
  dateOfBirth: string;
  nationalIdNumber: string;
  phone: string;
  email: string;
}

export interface OfficerEmploymentDetails {
  staffId: string;
  regionDistrict: string;
  supervisorName: string;
}

export interface OfficerDocumentUpload {
  nationalIdFront: string;
  nationalIdBack: string;
  passportPhoto: string;
}

export interface PortfolioOfficerRegistrationPayload {
  role: 'portfolio_officer';
  password: string;
  submitForReview: boolean;
  personalInformation: OfficerPersonalInformation;
  employmentDetails: OfficerEmploymentDetails;
  documentUpload: OfficerDocumentUpload;
}

export interface ExtensionOfficerRegistrationPayload {
  role: 'extension_officer';
  password: string;
  submitForReview: boolean;
  personalInformation: OfficerPersonalInformation;
  employmentDetails: OfficerEmploymentDetails;
  documentUpload: OfficerDocumentUpload;
}

export interface BankInstitutionDetails {
  institutionName: string;
  bankLicenseNumber: string;
  tinNumber: string;
  headOfficeAddress: string;
}

export interface BankContactOfficerInformation {
  contactOfficerName: string;
  roleDesignation: string;
  phoneNumber: string;
  emailAddress: string;
}

export interface BankDocumentUpload {
  licenseCertificate: string;
  authorizationLetter: string;
}

export interface BankRegistrationPayload {
  role: 'bank';
  password: string;
  submitForReview: boolean;
  institutionDetails: BankInstitutionDetails;
  contactOfficerInformation: BankContactOfficerInformation;
  documentUpload: BankDocumentUpload;
}

export interface ProviderBusinessDetails {
  businessName: string;
  registrationNumber: string;
  tinNumber: string;
  businessAddress: string;
  contactPerson: string;
  phoneNumber: string;
  emailAddress: string;
}

export interface ProviderServiceTypeDetails {
  serviceTypes: ProviderServiceType[];
}

export interface ProviderServiceRegionCoverage {
  operationalJurisdictions: string[];
}

export interface ProviderDocumentUpload {
  businessRegistrationCertificate: string;
  tinCertificate: string;
  directorIdFront: string;
  portraitPhoto: string;
}

export interface ProviderRegistrationPayload {
  role: 'input_provider';
  password: string;
  submitForReview: boolean;
  businessDetails: ProviderBusinessDetails;
  serviceType: ProviderServiceTypeDetails;
  serviceRegionCoverage: ProviderServiceRegionCoverage;
  documentUpload: ProviderDocumentUpload;
}

export type RegistrationPayload =
  | PortfolioOfficerRegistrationPayload
  | ExtensionOfficerRegistrationPayload
  | BankRegistrationPayload
  | ProviderRegistrationPayload;

export interface RegistrationApiResponse {
  success: boolean;
  message: string;
  data: unknown;
  error?: {
    code?: string;
    details?: unknown;
  };
}

export interface RegistrationStateModel {
  loading: boolean;
  success: boolean;
  message: string | null;
  errors: string[];
  response: RegistrationApiResponse | null;
}

export const registrationInitialState: RegistrationStateModel = {
  loading: false,
  success: false,
  message: null,
  errors: [],
  response: null,
};
