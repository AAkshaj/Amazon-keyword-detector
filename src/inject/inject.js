var isrunning=false;
var totitems=0;
var curitem=0;
var myoffset=0;
var mypage=0;
var keyCounter=0;

var keyWords = ["heavy","samsung"];

function setPageLink(link, page) {
	if(link.match(/page=\d+/)) {
		return link.replace(/page=\d+/,'page='+page);
	} else {
		return link+'&page='+page.toString();
	}
}

function setPageLinkForSpecialPage(link,page) {
    if(!link){
        link = window.location.href;
    }
    if(link.match(/pg=\d+/)) {
        return link.replace(/pg=\d+/,'pg='+page);
    } else {
        return link+'&pg='+page.toString();
    }
}

function setTodaysDealLink(link,page) {
    if(link.match(/page:\d+/)){
        return link.replace(/page:\d+/,'page:'+page);
    }else {
        var prefix = "?";
        if(link.indexOf('?') > -1){
            prefix = '&'
        }
        return link+ prefix + 'gb_f_GB-SUPPLE=page:'+page.toString();
    }
}

function highlightKeywordItems(asin, item){
    for (var i = 0; i < keyWords.length; i++) {
        if(item["Product-Header"].toLowerCase().includes(keyWords[i])
            || item["Product-Information"].toLowerCase().includes(keyWords[i])
            || item["Product-Ldescription"].toLowerCase().includes(keyWords[i])
            || item["Product-Sdescription"].toLowerCase().includes(keyWords[i])
        ) {
            var domItem = document.querySelectorAll('[data-asin="' + asin + '"]');
            domItem[0].style = "-webkit-filter: grayscale(4);";
            // domItem[0].style = "background-color: red;";
            keyCounter = keyCounter + 1;
            chrome.runtime.sendMessage(
                {
                    event: "updateBadgeCounter",
                    data: keyCounter + ""
                }
            );
            return;
        }
    }
}

function parsePages() {
    isrunning=true;
    var seller_id = false;
    var isInCategoryPage = false;
    var isSpecialCategory = false;
    var isTodaysDeal = false;
    var isCart = false;
    var isGiftTiles = false;
    var isPrimeSearch = false;

    var todayDealRegex = /gp\/goldbox/;
    var cartRegex = /gp\/cart/;

    if($.query.get('seller') && $.query.get('seller') !== true) {
        seller_id = $.query.get('seller');
    } else if($.query.get('merchant') && $.query.get('merchant') !== true) {
        seller_id = $.query.get('merchant');
    } else if($.query.get('me') && $.query.get('me') !== true) {
        seller_id = $.query.get('me');
    } else if($('#merchant-info a:first').size()) {
        var href = jQuery.query.empty().load($('#merchant-info a:first').attr('href'));
        if(href.get('seller') && href.get('seller') !== true) {
            seller_id = href.get('seller');
        }
    }else if($(".s-result-item").length > 0){
        isInCategoryPage = true;
    }else if($("#zg_browseRoot").length > 0){
        isSpecialCategory = true;
    }else if(todayDealRegex.test(window.location.href)){
        isTodaysDeal = true;
    }else if(cartRegex.test(window.location.href)){
        isCart = true;
    }else if($("body").html().match(/Our favorite toys for everyone on your list/)){
        isGiftTiles =true;
    }else if(window.location.hostname == 'primenow.amazon.com' && $('.grid-item').length > 0){
        isPrimeSearch = true;
    }

    if(!seller_id  && !isInCategoryPage && !isSpecialCategory && !isTodaysDeal && !isGiftTiles && !isPrimeSearch && !isCart) {
        return false;
    }

    var asins = {};

    var parseAsinsFromPage = function(doc) {
        var exp='li.s-result-item';
        if(doc.find(exp).length==0)
        {
            exp='div.s-result-item';
        }
        doc.find(exp).each(function(){
            var self = $(this);
            var asin = self.data('asin');
            var price = self.find('.a-color-price.s-price.a-text-bold').text().split(' - ');

            if(!price || (price.length == 1 && !price[0])){
                var whole = self.find('.sx-price-whole').text();
                var fraction = self.find('.sx-price-fractional').text();
                var minPrice = '';
                minPrice = whole;
                if(fraction){
                    minPrice += "." + fraction;
                }

                var maxPrice = self.find('.a-text-strike').text();
                price = [minPrice,maxPrice];
            }
            var obj = {};
            obj['min-price'] = price[0] || '';
            obj['by']="";
            try
            {
                var by = self.find('.a-color-secondary:nth-child(2)').text();
                obj['by'] = by;
            }
            catch(exx1)
            {
                
            }
            obj['max-price'] = price[1] || '';
            obj['link'] ='https://' + window.location.hostname +'/dp/'+asin;
            if(asins[asin] === undefined) {
                asins[asin] = obj;
            }
        });
    };

    var recLink;
    var tempRecLink = [];
    var stepIntermediate;

    function processPage(ele){
        ele.find(".s-result-item").each(function (i, e) {
            var ele = $(e);
            var asin = ele.data('asin');
            var price = $(ele.find('.s-price:first')).text();
            var maxPrice = '';

            /*
            if(!price){
                var matchText = ele.html().match(/\$[\d]+(\.[\d]*)?/);
                if(matchText){
                    price = matchText[0];
                }
            }
            */
            if(!price){
                var whole = ele.find('.sx-price-whole').text();
                var fraction = ele.find('.sx-price-fractional').text();
                price = whole;
                if(fraction){
                    price += "." + fraction;
                }

                maxPrice = ele.find('.a-text-strike').text();

            }
            
            if(!price){
                var matchText = ele.html().match(/\$[\d]+(\.[\d]*)?/);
                if(matchText){
                    price = matchText[0];
                }
            }
            
            if(!price)
            {
                price = ele.find('.a-price-whole').first().text();
            }

            
            var obj = {};
            obj['min-price'] = price || '';
            obj['max-price'] = maxPrice;
            obj['by']="";
            try
            {
                var by = ele.find('.a-color-secondary:nth-child(2)').text();
                obj['by'] = by;
            }
            catch(exx1)
            {
                
            }
            obj['link'] ='https://' + window.location.hostname +'/dp/'+asin;
            if(asins[asin] === undefined) {
                asins[asin] = obj;
            }
        });
        ele.empty();
    }

    function getAllCategoryLinks(ele){
        var links = [];
        ele.find("#zg_browseRoot > ul > li").each(function (i, e) {
            var ele = $(e);
            links.push(ele.children().first().attr('href'));
        });
        return links;
    }

    function processAllCategory(ele){
        ele.find(".zg_itemWrapper").each(function (i, e) {
            var ele = $(e);
            var minPrice, maxPrice;
            let priceText = ele.find('.a-color-price').text();
            if(priceText){
                var splitPrice = priceText.split('-');
                minPrice = splitPrice[0].trim();
                maxPrice = splitPrice[1] ? splitPrice[1].trim() : '';
            }

            var link = ele.find('a').first().attr('href');
            var regex = /((B0[\d\w]{8})|([\d]{10}))\//;
            if(link){
                var match = link.match(regex);
                var asin;
                if(!!match && match.length > 1){
                    asin = match[1];
                } else{
                    return;
                }

                var obj = {};
                obj['min-price'] = minPrice || '';
                obj['by']="";
                try
                {
                    var by = ele.find('.a-color-secondary:nth-child(2)').text();
                    obj['by'] = by;
                }
                catch(exx1)
                {
                    
                }
                obj['max-price'] = maxPrice || '';
                obj['link'] ='https://' + window.location.hostname +'/dp/'+asin;
                if(asins[asin] === undefined) {
                    asins[asin] = obj;
                }
            }

        });
    }

    function parseFromDealsPage(ele) {
        ele.find('.dealTile').each(function (i, e) {
            var link = $(e).children().first().attr('href');
            var minPrice = $(e).find('.a-size-medium.a-color-base.inlineBlock.unitLineHeight').html();
            var maxPrice = $(e).find('.a-size-base.a-color-base.inlineBlock.unitLineHeight.a-text-strike').html();
            var regex = /\/dp\/(.*)\/ref/;
            var match = link && link.match(regex);
            if(match){
                var asin = match[1];

                var obj = {};
                obj['min-price'] = minPrice || '';
                obj['by']="";
                try
                {
                    var by = $(e).find('.a-color-secondary:nth-child(2)').text();
                    obj['by'] = by;
                }
                catch(exx1)
                {
                    
                }
                obj['max-price'] = maxPrice || '';
                obj['link'] ='https://' + window.location.hostname +'/dp/'+asin;
                if(asins[asin] === undefined) {
                    asins[asin] = obj;
                }
            }else if(link){
                tempRecLink.push(link);
            }else{
            }
        });
    }

    function parseFromGridContainer(ele) {
        ele.find('.gridProductContainer').each(function (i, e) {
            var link = $(e).find('.productTitle').children().first().attr('href');
            var minPrice = $(e).find('.a-color-price').html();
            var maxPrice = '';

            var asin = null;
            var regex = /\/gp\/product\/(.*)\/ref/;
            var match = link && link.match(regex);
            if(match){
                asin =  match[1];
            }
            if(asin){
                var obj = {};
                obj['min-price'] = minPrice || '';
                obj['by']="";
                try
                {
                    var by = $(e).find('.a-color-secondary:nth-child(2)').text();
                    obj['by'] = by;
                }
                catch(exx1)
                {
                    
                }
                obj['max-price'] = maxPrice || '';
                obj['link'] ='https://' + window.location.hostname +'/dp/'+asin;
                if(asins[asin] === undefined) {
                    asins[asin] = obj;
                }
            }else if(link){
                tempRecLink.push(link);
            }else{
            }
        });
    }

    function parseFromTableLayout(ele) {
        ele.find('table.a-normal').each(function (i, e) {
            var link = $(e).find('.a-link-normal').attr('href');
            var minPrice = $(e).find('.a-color-price.a-text-bold').text();
            var maxPrice = '';

            var asin = null;
            var regex = /ASIN=(.*)&merchantID/;
            var match = link && link.match(regex);
            if(match){
                asin =  match[1];
            }
            if(asin){
                var obj = {};
                obj['min-price'] = minPrice || '';
                obj['by']="";
                try
                {
                    var by = $(e).find('.a-color-secondary:nth-child(2)').text();
                    obj['by'] = by;
                }
                catch(exx1)
                {
                    
                }
                obj['max-price'] = maxPrice || '';
                obj['link'] ='https://' + window.location.hostname +'/dp/'+asin;
                if(asins[asin] === undefined) {
                    asins[asin] = obj;
                }
            }else if(link){
                tempRecLink.push(link);
            }else{
            }
        });
    }

    function parseFromGiftPage(ele) {
        ele.find('.bxw-gift-finder__product-grid__tile').each(function (i, e) {
            var text = $(e).html();
            var minPrice = $(e).find('.a-color-price.a-text-bold').text();
            var maxPrice = '';

            var asin = null;
            var regex = /\/gp\/product\/(B0[\d\w]{8})\//;
            var match = text && text.match(regex);
            if(match){
                asin =  match[1];
            }

            if(asin){
                var obj = {};
                obj['min-price'] = minPrice || '';
                obj['by']="";
                try
                {
                    var by = $(e).find('.a-color-secondary:nth-child(2)').text();
                    obj['by'] = by;
                }
                catch(exx1)
                {
                    
                }
                obj['max-price'] = maxPrice || '';
                obj['link'] ='https://' + window.location.hostname +'/dp/'+asin;
                if(asins[asin] === undefined) {
                    asins[asin] = obj;
                }
            }
        });
    }

    function parseFromPrimeSearch(ele) {
        ele.find('.grid-item').each(function (i, e) {

            var dataOfferJson = $(e).find('.asin__offer-data').attr('data-offer');
            let dataOffer = JSON.parse(dataOfferJson);
            var minPrice = dataOffer.price;
            var maxPrice = '';

            var asin = dataOffer.asin;

            if(asin){
                var obj = {};
                obj['min-price'] = minPrice || '';
                obj['by']="";
                try
                {
                    var by = $(e).find('.a-color-secondary:nth-child(2)').text();
                    obj['by'] = by;
                }
                catch(exx1)
                {
                    
                }
                obj['max-price'] = maxPrice || '';
                obj['link'] ='https://' + window.location.hostname +'/dp/'+asin;
                if(asins[asin] === undefined) {
                    asins[asin] = obj;
                }
            }
        });
    }

    function processPageAccordly(ele){
        if(ele.find(".s-result-item").length > 0){
            console.log("Item layout detected");
            processPage(ele);
        }else if(ele.find(".zg_itemWrapper").length > 0){
            console.log("ZG layout detected");
            processAllCategory(ele);
        }else if(ele.find('.dealTile').length > 0){
            console.log("Deals layout detected");
            parseFromDealsPage(ele);
        }else if(ele.find('.gridProductContainer').length > 0){
            console.log("GridContainer layout detected");
            parseFromGridContainer(ele);
        }else if(ele.find("table.a-normal").length > 0){
            console.log("Table layout detected");
            parseFromTableLayout(ele);
        }else if(isGiftTiles){
            parseFromGiftPage(ele);
        }else if(isPrimeSearch){
            parseFromPrimeSearch(ele);
        }
    }

    var pages = 1;
    var pageLink = location.origin + '/s?merchant='+seller_id+'&fap=1&page_id=1';
    var currentPage = myoffset;
    currentPage=parseInt(currentPage);

    var fetchItemDetails = function(){
        if(isrunning)
        {
            try
            {
                totitems=0;
                curitem=0;
                isrunning=false;
                $.each(asins, function(key,value) {
                $.get(value.link,function(res){
                    try
                    {
                            var elem=$(res);
                            var ship=elem.find('#ourprice_shippingmessage').find('.a-size-base').text();
                            if(!ship)
                            {
                                ship=elem.find('#saleprice_shippingmessage').find('.a-size-base').text();
                            }
                            if(ship!="")
                            {									
                                ship=ship.substring(0, ship.toLowerCase().indexOf("shipping"));
                                ship=ship.replace("+", "");
                                ship=ship.replace("&", "");
                                ship=ship.replace("FREE", "");
                                ship=ship.trim();
                                if(ship=="")
                                {
                                    ship="0";
                                }
                            }
                            else
                            {
                                ship="0";
                            }
                            var nprice=elem.find('#priceblock_ourprice').text();
                            var asin=elem.find('#ASIN').val();
                            ship=ship.replace("+", "");
                            var obj=asins[asin];
                            obj['shipping'] = ship;
                            if(!nprice)
                            {
                                nprice=elem.find('#priceblock_saleprice').text();
                            }
                            if(nprice)
                            {
                                obj['min-price']=nprice;
                            }
                            obj['shipping']=obj['shipping'].replace(/[^0-9.]/g, "");
                            obj['min-price']=obj['min-price'].replace(/[^0-9.]/g, "");
                            obj['shipping']=obj['shipping'].replace("\$", "");
                            obj['min-price']=obj['min-price'].replace("\$", "");
                            obj['shipping']=obj['shipping'].replace("CDN", "");
                            obj['min-price']=obj['min-price'].replace("CDN", "");
                            var tot=0;
                            try
                            {
                                tot=parseFloat(obj['shipping'])+parseFloat(obj['min-price']);
                            }
                            catch(errprice)
                            {
                                
                            }
                            obj['max-price']=tot;							
                            obj['Product-Header']="";
                            obj['Product-Information']="";
                            obj['Product-Color']="";
                            obj['Product-Sdescription']="";
                            obj['Product-Ldescription']="";
                            obj['Product-Dimensions']="";
                            obj['Review-Number']="";
                            obj['Customer-Review']="";
                            obj['Product-Dimensions']="";
                            obj['Product-Weight']="";
                            obj['Product-SWeight']="";
                            obj['Product-ModelNumber']="";
                            obj['Image-Url']="";
                            obj['Availability']="";
                            obj['merchant-info']="";
                            obj['Best-Seller-Rank']="";
                            
                            
                            try
                            {
                                obj['Product-Color']=elem.find('#variation_color_name').find('.selection').text().trim();
                            }
                            catch(err1)
                            {
                                
                            }
                            try
                            {
                                obj['merchant-info']=elem.find('#merchant-info').text().trim();
                            }
                            catch(errmerchant)
                            {
                                
                            }
                            
                            try
                            {
                                obj['Product-Sdescription']=elem.find('#featurebullets_feature_div').text().trim();
                            }
                            catch(err1)
                            {
                                
                            }
                            
                            try
                            {
                                obj['Product-Ldescription']=elem.find('#dpx-aplus-3p-product-description_feature_div').text().trim();
                                if(obj['Product-Ldescription']=="")
                                {
                                    obj['Product-Ldescription']=elem.find('#productDescription').text().trim();
                                }
                            }
                            catch(err1)
                            {
                                
                            }
                            
                            try
                            {
                                obj['Product-Header']=elem.find('#productTitle').text().trim();
                            }
                            catch(err1)
                            {
                                
                            }
                            try
                            {
                                obj['Product-Information']=elem.find('#productDescription').text().trim();
                            }
                            catch(err1)
                            {
                                
                            }
                            
                            try
                            {
                                var elems=elem.find('#productDetails_techSpec_section_1').find('tr');
                                if(elems.length==0)
                                {
                                elems=elem.find('.section.techD').find('tr');
                                }
                                obj['Product-Information']="";

                                elems.each(function(index)
                                {
                                    var srch="th";
                                    var srch2="td";
                                    if($(this).find('th').length==0)
                                    {
                                        srch=".label";
                                        srch2=".value";
                                    }
                                    
                                    var str=$(this).find(srch).text().replace(/\n/g, "").trim()+" : ";
                                    if($(this).find(srch).text().replace(/\n/g, "").trim()=="Product Dimensions")
                                    {
                                        obj['Product-Dimensions']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                    }
                                    try
                                    {
                                        if($(this).find(srch).text().replace(/\n/g, "").trim()=="Customer Reviews")
                                        {
                                            obj['Customer-Review']=$(this).find(srch2).find(".a-icon-alt").text().replace(/\n/g, "").trim();
                                        }
                                        
                                        if($(this).find(srch).text().replace(/\n/g, "").trim()=="Customer Reviews")
                                        {
                                            obj['Review-Number']=$(this).find(srch2).find(".a-link-normal").text().replace(/\n/g, "").trim();
                                            obj['Review-Number']=obj['Review-Number'].replace(obj['Customer-Review'],"").trim().replace(" customer reviews","");
                                        }

                                    }
                                    catch(errreview)
                                    {
                                        
                                    }
                                    try
                                    {
                                        if($(this).find(srch).text().replace(/\n/g, "").trim()=="Best Sellers Rank")
                                        {
                                            obj['Best-Seller-Rank']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                            obj['Best-Seller-Rank']=obj['Best-Seller-Rank'].substring(0,obj['Best-Seller-Rank'].indexOf(' in')).replace("#","");
                                        }
                                    }
                                    catch(errreview)
                                    {
                                        
                                    }
                                    
                                    
                                    if($(this).find(srch).text().replace(/\n/g, "").trim()=="Package Dimensions")
                                    {
                                        obj['Product-Dimensions']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                    }
                                    if($(this).find(srch).text().replace(/\n/g, "").trim()=="Colour")
                                    {
                                        obj['Product-Color']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                    }
                                    if($(this).find(srch).text().replace(/\n/g, "").trim()=="Item Weight")
                                    {
                                        obj['Product-Weight']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                    }
                                    if($(this).find(srch).text().replace(/\n/g, "").trim()=="Shipping Weight")
                                    {
                                        obj['Product-SWeight']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                    }
                                    if($(this).find(srch).text().replace(/\n/g, "").trim()=="Item model number")
                                    {
                                        obj['Product-ModelNumber']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                    }
                                    if($(this).find(srch).text().replace(/\n/g, "").trim()=="Model Number")
                                    {
                                        obj['Product-ModelNumber']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                    }
                                    if($(this).find(srch).text().replace(/\n/g, "").trim()=="Customer Reviews")
                                    {
                                        try
                                        {
                                            str=str+$(this).find(srch2).find('div').text().replace(/\n/g, "").trim();
                                        }
                                        catch(ex)
                                        {
                                            str=str+$(this).find(srch2).find('div').text().replace(/\n/g, "").trim();
                                        }
                                    }
                                    else
                                    {
                                        str=str+$(this).find(srch2).text().replace(/\n/g, "").trim();
                                    }
                                    
                                    obj['Product-Information']=obj['Product-Information']+str+"\n";
                                });
                                
                            }
                            catch(err1)
                            {
                                
                            }
                            
                            try
                            {
                                var elems=elem.find('#productDetails_detailBullets_sections1').find('tr');
                                if(elems.length==0)
                                {
                                    elems=elem.find('.section.techD').find('tr');
                                }

                                    elems.each(function(index)
                                    {
                                        var srch="th";
                                        var srch2="td";
                                        if($(this).find('th').length==0)
                                        {
                                            srch=".label";
                                            srch2=".value";
                                        }
                                        
                                        var str=$(this).find(srch).text().replace(/\n/g, "").trim()+" : ";
                                        if($(this).find(srch).text().replace(/\n/g, "").trim()=="Product Dimensions")
                                        {
                                            obj['Product-Dimensions']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                        }
                                        try
                                        {
                                            if($(this).find(srch).text().replace(/\n/g, "").trim()=="Customer Reviews")
                                            {
                                                obj['Customer-Review']=$(this).find(srch2).find(".a-icon-alt").text().replace(/\n/g, "").trim();
                                            }
                                            
                                            if($(this).find(srch).text().replace(/\n/g, "").trim()=="Customer Reviews")
                                            {
                                                obj['Review-Number']=$(this).find(srch2).find(".a-link-normal").text().replace(/\n/g, "").trim();
                                                obj['Review-Number']=obj['Review-Number'].replace(obj['Customer-Review'],"").trim().replace(" customer reviews","");
                                            }

                                        }
                                        catch(errreview)
                                        {
                                            
                                        }
                                        try
                                        {
                                            if($(this).find(srch).text().replace(/\n/g, "").trim()=="Best Sellers Rank")
                                            {
                                                obj['Best-Seller-Rank']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                                obj['Best-Seller-Rank']=obj['Best-Seller-Rank'].substring(0,obj['Best-Seller-Rank'].indexOf(' in')).replace("#","");
                                            }
                                        }
                                        catch(errreview)
                                        {
                                            
                                        }
                                        
                                        
                                        if($(this).find(srch).text().replace(/\n/g, "").trim()=="Package Dimensions")
                                        {
                                            obj['Product-Dimensions']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                        }
                                        if($(this).find(srch).text().replace(/\n/g, "").trim()=="Colour")
                                        {
                                            obj['Product-Color']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                        }
                                        if($(this).find(srch).text().replace(/\n/g, "").trim()=="Item Weight")
                                        {
                                            obj['Product-Weight']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                        }
                                        if($(this).find(srch).text().replace(/\n/g, "").trim()=="Shipping Weight")
                                        {
                                            obj['Product-SWeight']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                        }
                                        if($(this).find(srch).text().replace(/\n/g, "").trim()=="Item model number")
                                        {
                                            obj['Product-ModelNumber']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                        }
                                        if($(this).find(srch).text().replace(/\n/g, "").trim()=="Model Number")
                                        {
                                            obj['Product-ModelNumber']=$(this).find(srch2).text().replace(/\n/g, "").trim();
                                        }
                                        if($(this).find(srch).text().replace(/\n/g, "").trim()=="Customer Reviews")
                                        {
                                            try
                                            {
                                                str=str+$(this).find(srch2).find('div').text().replace(/\n/g, "").trim();
                                            }
                                            catch(ex)
                                            {
                                                str=str+$(this).find(srch2).find('div').text().replace(/\n/g, "").trim();
                                            }
                                        }
                                        else
                                        {
                                            str=str+$(this).find(srch2).text().replace(/\n/g, "").trim();
                                        }
                                        
                                        obj['Product-Information']=obj['Product-Information']+str+"\n";
                                    });
                                
                            }
                            catch(err1)
                            {
                                
                            }

                            try
                            {
                                obj['Image-Url']=elem.find('#imgTagWrapperId').find('img').attr("data-a-dynamic-image").trim();
                                
                            }
                            catch(err1)
                            {
                                //alert(err1);
                            }
                            if(obj['Image-Url']=="")
                            {
                                try
                                {
                                    obj['Image-Url']=elem.find('#img-canvas').find('img').attr("data-a-dynamic-image").trim();
                                    
                                }
                                catch(err1)
                                {
                                    //alert(err1);
                                }
                            }
                            
                            try
                            {
                                obj['Availability']=elem.find('#availability').text().trim();
                                
                            }
                            catch(err1)
                            {
                                //alert(err1);
                            }
                            if(obj['Product-Information']=="")
                            {
                                try
                                {
                                    obj['Product-Information']=elem.find('#detail_bullets_id').text().replace(/\s\s+/g, ' ');
                                    
                                }
                                catch(err1)
                                {
                                    //alert(err1);
                                }
                            }
                            obj['Product-Information'] = obj['Product-Information'].replace(/#/g,"");
                            obj['Image-Url'] = obj['Image-Url'].replace(/#/g,"");
                            obj['Product-Ldescription'] = obj['Product-Ldescription'].replace(/#/g,"");
                            obj['merchant-info'] = obj['merchant-info'].replace(/#/g,"");
                            asins[asin]=obj;
                            highlightKeywordItems(asin, obj);
                    }
                    catch(err)
                    {
                        //alert(err);
                    }
                    curitem++;
                }).fail(function() {
                    curitem++;
                  });
                totitems++;
                }); 					
            }
            catch(err2)
            {

            }
        }
    };

    if(seller_id){ 
        var pagesQueue = async.queue(function (task, callback) {
            var link = setPageLink(pageLink,task.page);
            $.get(link,function(res){
                parseAsinsFromPage($(res));
                callback();
            });

            if(task.page == pages){
                setTimeout(function () {
                    pagesQueue.kill();
                    fetchItemDetails();
                },10000);
            }
        }, 4);

        $.get(pageLink,function(res){
            var matches = res.match(/<span class="pagnDisabled">(\d+)<\/span>/);
            if(matches) {
                pages = parseInt(matches[1]);
            } else {
                matches = res.match(/(\d+)<\/a><\/span>\s*<span class="pagnRA">/);
                if(!matches) {
                    matches = res.match(/<li class="a-disabled">(\d+)<\/li>/);
                }
                if(matches) {
                    pages = matches[1];
                } else {
                    pages = 1;
                }
            }
            
            if(pages>mypage)
            {
                pages=mypage;
            }

            for(var i = currentPage; i <= pages; i++) {
                pagesQueue.push({page: i});
            }

            pagesQueue.drain = fetchItemDetails;
        });
    }else if(isInCategoryPage){
        pageLink = window.location.href;
        pageLink = setPageLink(pageLink,1);
        console.log("$ck pageLink",pageLink);

        var nop = parseInt($(".pagnDisabled").first().text());
        if(isNaN(nop)){
            nop = parseInt($(".pagnRA").prev().text())
        }
        if(isNaN(nop)){
            nop = parseInt($(".a-disabled").first().text());
        }

        if(isNaN(nop)){
            nop = 2;
        }

        pages = nop;
        if(pages>mypage)
        {
            pages=mypage;
        }
        var pagesQueue = async.queue(function (task, callback) {
            var link = setPageLink(pageLink,task.page);
            $.get(link,function(res){
                processPage($(res));
                callback();
            });
            if(task.page == pages){
                setTimeout(function () {
                    pagesQueue.kill();
                    fetchItemDetails();
                },10000);
            }
        }, 4);
        for(var i = currentPage; i <= pages; i++) {
            pagesQueue.push({page: i});
        }
        pagesQueue.drain = fetchItemDetails;
    }else if(isSpecialCategory||isCart){

        let selectedText = $("span.zg_selected").text();
        let links = [];
        if(selectedText && selectedText.match(/Any Department/)){
            links = getAllCategoryLinks($(document));
        }else{
            links.push(window.location.href);
        }

        pagesQueue = async.queue(function (task, callback) {
            var link = setPageLinkForSpecialPage(task.categoryLink,task.page);
            $.get(link,function(res){
                processAllCategory($(res));
                callback();
            }).fail(function () {
                console.log("Failed" + link);
            });
        }, 4);

        for(var i=0;i<links.length; i++){
            for(var j=0;j< 5;j++){
                pagesQueue.push({categoryLink: links[i],categoryNo: i+1, page: j+1});
            }
        }

        pagesQueue.drain = fetchItemDetails;


    }else if(isTodaysDeal){

        pageLink = window.location.href;
        var pagesQueue = async.queue(function (task, callback) {
            var iframe = $('<iframe src="' + task.link + '" width="800px" height="800px"></iframe>');
            iframe.on('load',function (e) {
                console.log("Loaded");
                processPageAccordly($(this).contents());
                callback();
            });
            $('body').append(iframe);
        }, 4);

        $(".a-pagination > .a-last").prev().each(function (i, e) {
            var temp = parseInt($(e).text());
            if(!isNaN(temp)){
                pages = temp;
            }
        });

        if(pages>mypage)
        {
            pages=mypage;
        }
        for(var i = 1; i <= pages; i++) {
            var link = setTodaysDealLink(pageLink,i);
            pagesQueue.push({link:link,page: i});

        }

        stepIntermediate = function(){
            recLink = tempRecLink;
            tempRecLink = [];
            if(recLink.length <1){
                fetchItemDetails();
                return;
            }
            for(var i = 1; i <= recLink.length; i++) {
                pagesQueue.push({link:recLink[i],page: i});

            }
            pagesQueue.drain = fetchItemDetails
        };

        pagesQueue.drain = stepIntermediate;
    }else if(isGiftTiles){

        var link = `https://www.amazon.com/gp/acs/ajax/acsux-s9-proxy.html?acs.pageNumber=1&pageNumber=1&eventId=HTL&marketplaceID=ATVPDKIKX0DER&pageTypeID=101&fetchAllProductAttributes=true&strategy=acsStrategy&widgetName=giftFinder&sessionID=191-1820305-6048000&slotName=merchandised-search-3&output=html&debug=true&componentServiceName=S9RemoteComponentService&data.dedupe=NONE&acs.debug=true&acs.localminihook=&filtering=NONE&dataSource=S9_ACS_DEALS&showListPrice=true&featuredSize=0&queryProfile=%7B%7DdcsSortOrder=BY_RELEVANCE`;
        console.log("In gift tile");

        var nop = 0
        $(".a-pagination > .a-last").prev().each(function (i, e) {
            var temp = parseInt($(e).text());
            if(!isNaN(temp)){
                nop = temp;
            }
        });
        let links = [];

        for(var i = 0;i < nop; i++){
            links.push(link.replace(/pageNumber=1/g,'pageNumber=' + (i+1)));
        }

        pagesQueue = async.queue(function (task, callback) {
            var link = task.pageLink;
            $.get(link,function(res){
                processPageAccordly($(res));
                callback();
            }).fail(function () {
                console.log("Failed" + link);
            });
        }, 4);

        for(var i=0;i<links.length; i++){
            pagesQueue.push({pageLink: links[i],pageNo: i+1});
        }

        pagesQueue.drain = fetchItemDetails;
    }else if(isPrimeSearch){
        link = window.location.href;
        if(!link.match(/page=/)){
            link += '&page=1'
        }else{
            link = link.replace(/page=[\d]+/,'page=1');
        }
        console.log("In prime search");

        nop = 0;
        $("#house-search-pagination .a-last").prev().each(function (i, e) {
            var temp = parseInt($(e).text());
            if(!isNaN(temp)){
                nop = temp;
            }
        });
        console.log("Number of pages" + nop);
        let links = [];

        for(i = 0;i < nop; i++){
            links.push(link.replace(/page=1/g,'page=' + (i+1)));
        }

        pagesQueue = async.queue(function (task, callback) {
            var link = task.pageLink;
            $.get(link,function(res){
                processPageAccordly($(res));
                callback();
            }).fail(function () {
                console.log("Failed" + link);
            });
        }, 4);

        for(var i=0;i<links.length; i++){
            pagesQueue.push({pageLink: links[i],pageNo: i+1});
        }

        pagesQueue.drain = fetchItemDetails;
    }
}

parsePages();