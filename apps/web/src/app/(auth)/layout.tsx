/**
 * Auth layout: no main app header, full-height for login/register flows.
 */
export default function AuthLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return <>{children}</>;
}
