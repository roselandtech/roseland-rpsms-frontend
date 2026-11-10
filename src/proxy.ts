import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'BURSAR', 'TEACHER'];

const PROTECTED_PORTALS: Record<string, string[]> = {
  '/admin': STAFF_ROLES,
  '/headmaster': STAFF_ROLES,
  '/teacher': STAFF_ROLES,
  '/parent': ['PARENT', 'ADMIN', 'SUPER_ADMIN', 'HEADMASTER'],
  '/bursar': STAFF_ROLES,
  '/cbt': ['STUDENT', ...STAFF_ROLES],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if current path starts with any protected portal route
  const matchingPortalPrefix = Object.keys(PROTECTED_PORTALS).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!matchingPortalPrefix) {
    return NextResponse.next();
  }

  const token = request.cookies.get('roseland_token')?.value;
  const role = request.cookies.get('roseland_role')?.value;

  // If no authentication token is present, redirect directly to /login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check RBAC permission for this specific portal
  const allowedRoles = PROTECTED_PORTALS[matchingPortalPrefix];
  if (role && allowedRoles && !allowedRoles.includes(role)) {
    // Redirect unauthorized user to their primary portal
    let targetPortal = '/login';
    switch (role) {
      case 'ADMIN':
        targetPortal = '/admin/permissions';
        break;
      case 'SUPER_ADMIN':
      case 'HEADMASTER':
        targetPortal = '/headmaster';
        break;
      case 'BURSAR':
        targetPortal = '/admin/finance';
        break;
      case 'TEACHER':
        targetPortal = '/teacher';
        break;
      case 'PARENT':
        targetPortal = '/parent';
        break;
      case 'STUDENT':
        targetPortal = '/cbt';
        break;
    }
    return NextResponse.redirect(new URL(targetPortal, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/headmaster/:path*',
    '/teacher/:path*',
    '/parent/:path*',
    '/bursar/:path*',
    '/cbt/:path*',
  ],
};
