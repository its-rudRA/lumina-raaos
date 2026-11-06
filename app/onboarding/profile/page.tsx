'use client'

import { OnboardingStub } from '@/components/onboarding-stub'

export default function ProfileOnboardingPage() {
  return (
    <OnboardingStub
      step={2}
      title="Wellness Profile"
      patch={{ introSeen: true, profileCompleted: true }}
      next="/onboarding/tutorial"
      cta="Continue"
    />
  )
}
