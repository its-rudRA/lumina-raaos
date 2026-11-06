'use client'

import { OnboardingStub } from '@/components/onboarding-stub'

export default function IntroductionPage() {
  return (
    <OnboardingStub
      step={1}
      title="Introduction"
      patch={{ introSeen: true }}
      next="/onboarding/profile"
      cta="Continue"
    />
  )
}
