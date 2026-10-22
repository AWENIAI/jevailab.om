import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/(pages)/ai')({
  beforeLoad: () => {
    // TODO: /ai currently redirects to /#create. Once /create ships, point this
    // redirect at /create instead.
    throw redirect({ to: '/', hash: 'create' });
  },
});
