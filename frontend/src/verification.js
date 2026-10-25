export const VERIFICATION_DOCUMENTS = {
  volunteer: [
    { key: 'id_proof', label: 'Identity proof' },
    { key: 'address_proof', label: 'Address proof' },
    { key: 'profile_photo', label: 'Profile photo' },
  ],
  ngo: [
    { key: 'registration_proof', label: 'Organisation registration proof' },
    { key: 'address_proof', label: 'Organisation address proof' },
    { key: 'profile_photo', label: 'Representative profile photo' },
  ],
  blood_bank: [
    { key: 'registration_proof', label: 'Facility registration proof' },
    { key: 'address_proof', label: 'Facility address proof' },
    { key: 'profile_photo', label: 'Representative profile photo' },
  ],
}

export function getAccessToken() {
  return (
    localStorage.getItem('relink_token') ||
    localStorage.getItem('resqlink_token') ||
    localStorage.getItem('token') ||
    ''
  )
}
