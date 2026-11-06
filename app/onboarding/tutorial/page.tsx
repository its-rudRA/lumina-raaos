'use client'

import { OnboardingStub } from '@/components/onboarding-stub'

export default function TutorialPage() {
  return (
    <OnboardingStub
      step={3}
      title="Interactive Tutorial"
      patch={{ introSeen: true, profileCompleted: true, tutorialCompleted: true }}
      next="/home"
      cta="Enter My Sanctuary"
    />
  )
}
