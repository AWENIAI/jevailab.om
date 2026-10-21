import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/(pages)/ai')({
  beforeLoad: () => {
    throw redirect({ to: '/', hash: 'create' });
  },
});
