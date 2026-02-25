import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/storage/secure_storage_service.dart';

class SplashPage extends StatefulWidget {
  final SecureStorageService storage;
  const SplashPage({super.key, required this.storage});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final token = await widget.storage.getAccessToken();
    if (!mounted) return;
    if (token == null) {
      context.go('/login');
    } else {
      context.go('/role-selector');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
