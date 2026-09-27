// CanliFal - minimal HTTP istemcisi (referans)
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({this.baseUrl = 'https://canlifal.com', this.accessToken});
  final String baseUrl;
  String? accessToken;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (accessToken != null) 'Authorization': 'Bearer $accessToken',
      };

  /// Backend bazi uclarda zarfli ({success,data}), bazilarinda duz nesne doner.
  /// Tek noktadan normalize ediyoruz.
  dynamic _unwrap(http.Response r) {
    final body = jsonDecode(utf8.decode(r.bodyBytes));
    if (body is Map && body.containsKey('success')) {
      if (body['success'] == false) {
        final e = body['error'];
        throw ApiException(
          code: (e is Map ? e['code'] : null) ?? 'UNKNOWN',
          message: (e is Map ? e['message'] : null) ?? 'Bilinmeyen hata',
          status: r.statusCode,
        );
      }
      return body['data'] ?? body;
    }
    if (r.statusCode >= 400) {
      throw ApiException(code: 'HTTP_${r.statusCode}', message: r.body, status: r.statusCode);
    }
    return body;
  }

  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);
    return _unwrap(await http.get(uri, headers: _headers));
  }

  Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    final uri = Uri.parse('$baseUrl$path');
    return _unwrap(await http.post(uri, headers: _headers, body: jsonEncode(body ?? {})));
  }

  Future<dynamic> delete(String path) async =>
      _unwrap(await http.delete(Uri.parse('$baseUrl$path'), headers: _headers));
}

class ApiException implements Exception {
  ApiException({required this.code, required this.message, required this.status});
  final String code;
  final String message;
  final int status;
  @override
  String toString() => 'ApiException($status $code): $message';
}
