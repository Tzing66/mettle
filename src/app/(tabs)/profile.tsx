import { Card, Screen, Text } from '@/design/components';

export default function ProfileScreen() {
  return (
    <Screen>
      <Text variant="title">Profile</Text>
      <Card>
        <Text color="inkMuted">Bodyweight log, settings and your XP ledger arrive in Phase 1.</Text>
      </Card>
    </Screen>
  );
}
