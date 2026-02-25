import 'package:dio/dio.dart';

import '../env/app_env.dart';
import '../storage/secure_storage_service.dart';

class ApiClient {
  final SecureStorageService storage;
  late final Dio dio;

  ApiClient(this.storage) {
    dio = Dio(
      BaseOptions(
        baseUrl: AppEnv.apiBaseUrl,
        connectTimeout: AppEnv.connectTimeout,
        receiveTimeout: AppEnv.receiveTimeout,
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await storage.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            // Refresh flow can be wired here once backend refresh contract is finalized.
          }
          handler.next(error);
        },
      ),
    );
  }
}
