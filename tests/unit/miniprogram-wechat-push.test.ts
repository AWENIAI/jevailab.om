import { describe, expect, test } from 'vitest';
import { parseWechatPush } from '@/lib/miniprogram/wechat-message.server';

describe('WeChat virtual payment delivery push', () => {
  test('parses nested XML fields from safe-mode payloads', () => {
    const push = parseWechatPush(
      `<xml>
        <Event><![CDATA[xpay_goods_deliver_notify]]></Event>
        <OpenId><![CDATA[openid_1]]></OpenId>
        <OutTradeNo><![CDATA[mp_local_1]]></OutTradeNo>
        <Env>0</Env>
        <WeChatPayInfo>
          <MchOrderNo><![CDATA[wx_order_1]]></MchOrderNo>
          <OutTradeNo><![CDATA[mp_local_1]]></OutTradeNo>
        </WeChatPayInfo>
      </xml>`,
      'application/xml'
    );

    expect(push).toMatchObject({
      format: 'xml',
      event: 'xpay_goods_deliver_notify',
      openid: 'openid_1',
      outTradeNo: 'mp_local_1',
      platformOrderId: 'wx_order_1',
      env: 0,
    });
  });

  test('keeps compatibility with flattened XML fields', () => {
    const push = parseWechatPush(
      `<xml>
        <Event>xpay_goods_deliver_notify</Event>
        <OpenId>openid_1</OpenId>
        <OutTradeNo>mp_local_1</OutTradeNo>
        <WeChatPayInfo>
          <MchOrderNo>wx_order_1</MchOrderNo>
        </WeChatPayInfo>
      </xml>`,
      'text/xml'
    );

    expect(push.platformOrderId).toBe('wx_order_1');
  });

  test('parses nested JSON fields', () => {
    const push = parseWechatPush(
      JSON.stringify({
        Event: 'xpay_goods_deliver_notify',
        OpenId: 'openid_1',
        WeChatPayInfo: {
          MchOrderNo: 'wx_order_1',
          OutTradeNo: 'mp_local_1',
        },
        Env: 0,
      }),
      'application/json'
    );

    expect(push).toMatchObject({
      format: 'json',
      outTradeNo: 'mp_local_1',
      platformOrderId: 'wx_order_1',
    });
  });
});
