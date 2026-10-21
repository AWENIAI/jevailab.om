import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/(pages)/pricing')({
  beforeLoad: () => {
    throw redirect({ to: '/' });
  },
});
