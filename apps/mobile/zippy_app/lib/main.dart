import 'package:flutter/material.dart';

import 'app/router.dart';
import 'app/theme.dart';
import 'core/auth/auth_repository.dart';
import 'core/network/api_client.dart';
import 'core/realtime/socket_service.dart';
import 'core/storage/secure_storage_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  final storage = SecureStorageService();
  final apiClient = ApiClient(storage);
  final authRepository = AuthRepository(api: apiClient, storage: storage);
  final socketService = SocketService();

  runApp(ZippyApp(
    router: buildRouter(authRepository: authRepository, socketService: socketService, storage: storage),
  ));
}

class ZippyApp extends StatelessWidget {
  final dynamic router;
  const ZippyApp({super.key, required this.router});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Zippy',
      debugShowCheckedModeBanner: false,
      theme: ZippyTheme.light(),
      routerConfig: router,
    );
  }
}
