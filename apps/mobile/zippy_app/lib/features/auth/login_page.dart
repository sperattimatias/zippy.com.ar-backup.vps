import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_repository.dart';
import '../../core/errors/app_error.dart';
import '../../core/realtime/socket_service.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../shared/widgets/zippy_button.dart';
import '../../shared/widgets/zippy_input.dart';

class LoginPage extends StatefulWidget {
  final AuthRepository authRepository;
  final SocketService socketService;
  final SecureStorageService storage;

  const LoginPage({super.key, required this.authRepository, required this.socketService, required this.storage});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController(text: 'admin@zippy.com');
  final _password = TextEditingController(text: 'password123');
  bool _busy = false;
  String? _error;

  Future<void> _login() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = await widget.authRepository.login(_email.text.trim(), _password.text.trim());
      widget.socketService.connect(session.accessToken);
      widget.socketService.joinUserRoom(session.userId);
      context.go('/role-selector', extra: session.roles);
    } on AppError catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Bienvenido a Zippy', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700)),
              const SizedBox(height: 24),
              ZippyInput(label: 'Email', controller: _email),
              const SizedBox(height: 12),
              ZippyInput(label: 'Password', controller: _password, obscure: true),
              const SizedBox(height: 8),
              if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 16),
              ZippyButton(label: 'Ingresar', busy: _busy, onPressed: _login),
              TextButton(onPressed: () => context.go('/register'), child: const Text('Crear cuenta pasajero')),
            ],
          ),
        ),
      ),
    );
  }
}
