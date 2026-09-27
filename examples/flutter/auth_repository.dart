// Oturum: giris + 7g/30g token yasam dongusu + 401 uzerine tek seferlik yenileme
import 'api_client.dart';

class AuthRepository {
  AuthRepository(this._api);
  final ApiClient _api;
  String? refreshToken;

  Future<void> login(String email, String password) async {
    final d = await _api.post('/api/auth/mobile-login', {'email': email, 'password': password});
    _api.accessToken = d['accessToken'] as String?;
    refreshToken = d['refreshToken'] as String?;
  }

  /// accessToken 7 gun, refreshToken 30 gun gecerlidir.
  /// Sunucu ayni refreshToken'i 15 sn icinde tekrar kabul eder (dedupe),
  /// bu yuzden es zamanli 401'lerde tek cagri yeterlidir.
  Future<bool> refresh() async {
    if (refreshToken == null) return false;
    try {
      final d = await _api.post('/api/auth/mobile-refresh', {'refreshToken': refreshToken});
      _api.accessToken = d['accessToken'] as String?;
      refreshToken = (d['refreshToken'] as String?) ?? refreshToken;
      return true;
    } on ApiException {
      return false;
    }
  }

  Future<T> withRetry<T>(Future<T> Function() run) async {
    try {
      return await run();
    } on ApiException catch (e) {
      if (e.status != 401) rethrow;
      if (!await refresh()) rethrow;
      return await run();
    }
  }
}
