import { redirect } from 'next/navigation';

export default function NotFound() {
    redirect('/error?code=404&message=pageNotFound&retry=%2F');
}
