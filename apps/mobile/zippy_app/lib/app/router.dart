import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_repository.dart';
import '../core/realtime/socket_service.dart';
import '../core/storage/secure_storage_service.dart';
import '../features/auth/login_page.dart';
import '../features/auth/register_page.dart';
import '../features/auth/splash_page.dart';
import '../features/driver/driver_en_route_page.dart';
import '../features/driver/driver_home_page.dart';
import '../features/driver/driver_otp_page.dart';
import '../features/driver/incoming_requests_page.dart';
import '../features/passenger/destination_sheet_page.dart';
import '../features/passenger/passenger_home_page.dart';
import '../features/payments/earnings_page.dart';
import '../features/profile/role_selector_page.dart';
import '../features/ride/in_trip_page.dart';
import '../features/ride/waiting_page.dart';

CustomTransitionPage<void> _premiumTransition({required LocalKey key, required Widget child}) {
  return CustomTransitionPage<void>(
    key: key,
    child: child,
    transitionDuration: const Duration(milliseconds: 150),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween<Offset>(begin: const Offset(0.02, 0), end: Offset.zero).animate(curved),
          child: child,
        ),
      );
    },
  );
}

GoRouter buildRouter({
  required AuthRepository authRepository,
  required SocketService socketService,
  required SecureStorageService storage,
}) {
  return GoRouter(
    initialLocation: '/splash',
    routes: [
      GoRoute(path: '/splash', pageBuilder: (c, s) => _premiumTransition(key: s.pageKey, child: SplashPage(storage: storage))),
      GoRoute(
        path: '/login',
        pageBuilder: (c, s) => _premiumTransition(
          key: s.pageKey,
          child: LoginPage(authRepository: authRepository, socketService: socketService, storage: storage),
        ),
      ),
      GoRoute(path: '/register', pageBuilder: (c, s) => _premiumTransition(key: s.pageKey, child: RegisterPage())),
      GoRoute(
        path: '/role-selector',
        pageBuilder: (context, state) => _premiumTransition(
          key: state.pageKey,
          child: RoleSelectorPage(roles: (state.extra as List<String>?) ?? const ['passenger']),
        ),
      ),
      GoRoute(path: '/passenger/home', pageBuilder: (c, s) => _premiumTransition(key: s.pageKey, child: const PassengerHomePage())),
      GoRoute(path: '/passenger/destination', pageBuilder: (c, s) => _premiumTransition(key: s.pageKey, child: DestinationSheetPage())),
      GoRoute(path: '/ride/waiting', pageBuilder: (c, s) => _premiumTransition(key: s.pageKey, child: const WaitingPage())),
      GoRoute(path: '/ride/en-route', pageBuilder: (c, s) => _premiumTransition(key: s.pageKey, child: const WaitingPage())),
      GoRoute(path: '/ride/in-trip', pageBuilder: (c, s) => _premiumTransition(key: s.pageKey, child: const InTripPage())),
      GoRoute(path: '/driver/home', pageBuilder: (c, s) => _premiumTransition(key: s.pageKey, child: const DriverHomePage())),
      GoRoute(path: '/driver/requests', pageBuilder: (c, s) => _premiumTransition(key: s.pageKey, child: const IncomingRequestsPage())),
      GoRoute(path: '/driver/en-route', pageBuilder: (c, s) => _premiumTransition(key: s.pageKey, child: const DriverEnRoutePage())),
      GoRoute(path: '/driver/otp', pageBuilder: (c, s) => _premiumTransition(key: s.pageKey, child: DriverOtpPage())),
      GoRoute(path: '/driver/earnings', pageBuilder: (c, s) => _premiumTransition(key: s.pageKey, child: const EarningsPage())),
    ],
    errorBuilder: (context, state) => Scaffold(body: Center(child: Text(state.error.toString()))),
  );
}
