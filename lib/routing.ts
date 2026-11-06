import type { AuthUser, OnboardingStatus } from '@/lib/db'

/** Resolves the next destination for a user based on auth + onboarding progress. */
export function resolveEntryRoute(
  authUser: AuthUser | null | undefined,
  onboarding: OnboardingStatus | null | undefined
): string {
  if (!authUser) return '/welcome'
  if (!onboarding?.introSeen) return '/onboarding/introduction'
  if (!onboarding.profileCompleted) return '/onboarding/profile'
  if (!onboarding.tutorialCompleted) return '/onboarding/tutorial'
  return '/home'
}
