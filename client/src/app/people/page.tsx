'use client';

import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { PeopleView } from '@/components/people/PeopleView';

export default function PeoplePage() {
  return (
    <Layout>
      <PeopleView />
    </Layout>
  );
}
