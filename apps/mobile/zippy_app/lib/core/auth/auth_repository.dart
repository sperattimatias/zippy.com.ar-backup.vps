import 'package:dio/dio.dart';

import '../../shared/models/user_session.dart';
import '../errors/app_error.dart';
import '../network/api_client.dart';
import '../storage/secure_storage_service.dart';

class AuthRepository {
  final ApiClient api;
  final SecureStorageService storage;

  AuthRepository({required this.api, required this.storage});

  Future<UserSession> login(String email, String password) async {
    try {
      final Response<dynamic> res = await api.dio.post('/auth/login', data: {'email': email, 'password': password});
      final data = res.data as Map<String, dynamic>;
      final accessToken = data['access_token'] as String;
      final refreshToken = data['refresh_token'] as String?;
      final roles = (data['roles'] as List<dynamic>).map((e) => e.toString()).toList();
      final userId = data['user_id'] as String;
      await storage.saveTokens(accessToken: accessToken, refreshToken: refreshToken);
      return UserSession(userId: userId, roles: roles, accessToken: accessToken);
    } on DioException catch (e) {
      throw AppError(e.response?.data?['message']?.toString() ?? 'No pudimos iniciar sesión');
    }
  }

  Future<void> logout() => storage.clearSession();
}
