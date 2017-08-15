import {} from '../lego-lib/zepto/zepto.deferred.js';
import showPop from '../lego-lib/show-pop/0.1.3/showPop.min.js';
import Util from '../lib/util.js';

export default {
	/*微信授权*/
	rulesBind: function(callbackURL, user, actionURL) {
        $('#myForm').attr('action', actionURL);
        $('#hiddenUser').val(user);
        $('#hiddenURL').val(callbackURL);
        $('#myForm').submit();
    },
    /*支付入口*/
	pay: function(money, type) {
		var self = this;
		$('.js-input-window').addClass('hide');		
		if(!Util.is_weixn()){
			if(type == 3){
				console.log('微信支付');
				self.callwxpay(money);
			}else if(type == 2){
				console.log('支付宝支付');
				self.callAliPay(money);
			}
			return;
		}
		
        Util.ajaxGet('api/third/wechat/prepare',{
            charge: money
        }).done((jdata)=>{
            if (jdata.code == 1000) {
                self.wxPay( $.parseJSON(jdata.results), money );
            } else if (jdata.code == 9000) {
                showPop('系统繁忙，请稍后再试');
            } else if (jdata.code == 9001) {
                self.rulesBind(location.href, jdata.results.user, '/third/wechat/auth-receipt');
            } else if ( jdata.code == 9002 ) {
            	showPop(jdata.msg);
            }
        }).fail((jdata)=>{
        	showPop('网络有点卡哦！');
        })
    },
    /*网页支付*/
    wxPay: function(jsStr, money) {
		var self = this;
        WeixinJSBridge.invoke(
            'getBrandWCPayRequest', jsStr,
            function(res){
                if(res.err_msg == "get_brand_wcpay_request:ok" ) {
                    //成功
                    showPop({
						msg: `充值成功`,
						confirm: '确定',
						success: function(){
							window.location.href = window.location.href;
						}
					})
                } else {
                    showPop('充值失败，请重新发起！');
                }
            }
        );
    },
    /*支付宝支付*/
    callAliPay: function(money){
    	Util.ajaxGet('api/third/alipay/purchase',{
			charge: money,
			type: 'WAP'
		}).done((jdata)=>{
			if(jdata.code == 1000){
				window.location.href = jdata.data
			}else{
				showPop('充值失败');
			}
		}).fail((jdata)=>{
			showPop('充值失败');
		})
    },
    /*app发起支付*/
    callwxpay: function(money){
		var self = this;
		var obj = {};
		var u = navigator.userAgent;
        var isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1; //android终端
        var isiOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端
		Util.ajaxGet('api/third/wechat/prepare',{
			charge: money,
			type: 'APP'
		}).done((jdata)=>{
			if(typeof jdata == 'string'){
				jdata = $.parseJSON(jdata);
			}
			if(isiOS){
				self.callnativewxpay(jdata.results);
			}else{
				self.callnativewxpay(jdata.results);
			}
			
		}).fail((jdata)=>{
			showPop('充值失败');
		})
	},
	/*app支付*/
	callnativewxpay: function(paystr){
		var self = this;
		cb  = function(responseData) {
			if(responseData == 1){
				showPop('充值成功');
			}else{
				showPop('充值失败');
			}
		}
		// 调起来的时候在用
		appExec.callHandler('wxpay', paystr , cb);
	},
	/*兑换金币*/
	exchange: function(num,cb){
		var self = this;
		let ajaxData = {
			amount: num
		};
		if(!Util.is_weixn()){
			ajaxData = $.extend(ajaxData,{
				type: 'APP'
			});
		}
		Util.ajaxPost('api/third/wechat/lucky-money',ajaxData).done((jdata)=>{
			if (jdata.code == 1000) {
                // 发起微信支付
                showPop({
					msg: `提现成功`,
					confirm: '确定',
					success: function(){
						cb && cb();
					}
				})
            } else if (jdata.code == 9001) {
                self.rulesBind(location.href, jdata.results.user, '/third/wechat/auth-payment');
            } else {
				showPop(jdata.msg || '系统繁忙，请稍后再试');
				cb && cb();
			}
		}).fail((jdata)=>{
			showPop('兑换失败');
			console.log('exchange fail');
		})	
	},
}
