// Sesli oda yasam dongusu (12 adim) - referans akis
import 'api_client.dart';
import 'sse_client.dart';

class VoiceRoomFlow {
  VoiceRoomFlow(this._api, this._token);
  final ApiClient _api;
  final String _token;
  SseClient? _sse;

  Future<void> enter(String roomId) async {
    // 1) Oda detayi
    await _api.get('/api/chat/rooms/$roomId');
    // 2) Varlik kaydi (SSE presence bu kayda bagli)
    await _api.post('/api/chat/rooms/$roomId/presence');
    // 3) TRTC imzasi
    final sig = await _api.get('/api/trtc/usersig');
    // 4) TRTCCloud.enterRoom(sdkAppId: sig['sdkAppId'], userSig: sig['userSig'], ...)
    //    sdkAppId ISTEMCIDE SABIT YAZILMAMALI - sunucudan geleni kullanin.
    // 5) SSE akisi
    _sse = SseClient(
      url: '${_api.baseUrl}/api/chat/rooms/$roomId/stream',
      token: _token,
      onEvent: (event, data) {
        switch (event) {
          case 'messages': break;   // sohbet
          case 'presence': break;   // katilimci listesi
          case 'gift': break;       // hediye animasyonu
          case 'gift_box': break;   // hediye kutusu
          case 'pk': break;         // PK durumu
          case 'room_event': break; // koltuk/rol/yayin degisimi
          case 'system': break;
          case 'typing': break;
        }
      },
    );
    await _sse!.connect();
    // 6) Koltuklar
    await _api.get('/api/chat/rooms/$roomId/seats');
    // ignore: unused_local_variable
    final _ = sig;
  }

  Future<void> leave(String roomId) async {
    _sse?.close();
    // 12) Cikista varlik kaydini MUTLAKA sil - aksi halde 5 dk "hayalet" kullanici kalir.
    await _api.delete('/api/chat/rooms/$roomId/presence');
    // TRTCCloud.exitRoom()
  }
}
