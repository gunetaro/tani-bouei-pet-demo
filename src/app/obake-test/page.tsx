import { notFound } from 'next/navigation';
import ObakeTestClient from './ObakeTestClient';

export default function ObakeTestPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ObakeTestClient />;
}
