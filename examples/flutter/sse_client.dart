// SSE istemcisi - kopma/yeniden baglanma korumali.
// Sunucu kalp atisi: oda akisi 10 sn, digerleri 15 sn.
// Bu yuzden timeout >= 40 sn secilmistir.
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

typedef SseHandler = void Function(String event, dynamic data);

class SseClient {
  SseClient({required this.url, required this.token, required this.onEvent});
  final String url;
  final String token;
  final SseHandler onEvent;

  http.Client? _client;
  StreamSubscription? _sub;
  int _generation = 0;
  int _attempt = 0;
  bool _closed = false;

  Future<void> connect() async {
    if (_closed) return;
    final gen = ++_generation;
    _client?.close();
    final c = _client = http.Client();
    try {
      final req = http.Request('GET', Uri.parse(url))
        ..headers['Authorization'] = 'Bearer $token'
        ..headers['Accept'] = 'text/event-stream';
      final res = await c.send(req).timeout(const Duration(seconds: 40));
      if (gen != _generation) return; // eski baglanti - yoksay
      _attempt = 0;
      String event = 'message';
      _sub = res.stream.transform(utf8.decoder).transform(const LineSplitter()).listen(
        (line) {
          if (gen != _generation) return;
          if (line.startsWith('event:')) {
            event = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            final raw = line.substring(5).trim();
            if (raw.isEmpty) return;
            dynamic parsed;
            try { parsed = jsonDecode(raw); } catch (_) { parsed = raw; }
            onEvent(event, parsed);
            event = 'message';
          }
        },
        onDone: () => _reconnect(gen),
        onError: (_) => _reconnect(gen),
        cancelOnError: true,
      );
    } catch (_) {
      _reconnect(gen);
    }
  }

  void _reconnect(int gen) {
    if (_closed || gen != _generation) return;
    _attempt = (_attempt + 1).clamp(1, 6);
    final delay = Duration(seconds: [1, 2, 4, 8, 15, 30][_attempt - 1]);
    Timer(delay, connect);
  }

  void close() {
    _closed = true;
    _generation++;
    _sub?.cancel();
    _client?.close();
  }
}
