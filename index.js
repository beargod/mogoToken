var contractABI = "";
var mogo = "";
var txhash = new Vue({
    el:".txhash",
    data:{
        lastTxhash:"",
        metamask:1
    }
})
var content = new Vue({
    el: ".mogoapp",
    data: {
        tokenName:"",
        totalSupply:0,
        circulate:0,
        paused:0,
        ownerBalance:0,
        accountNumber:0,
        symbol:"",
        owner:"",
        address:"",
        targetAddress:"",
        targetValue:0,
        changePaused:1,
        fronze:0,
        freezeAddress:"",
        newOwnerAddress:"",
        batchAddress:[],
        allSelect:0,
        pageLength:100,
        pageSize:1,
        currentPage:1,
        cBatchAddress:[]
    },
    methods: {
        transfer: function (address,value) {
            if(!web3.isAddress(address)){
                toastr.error('目标地址格式错误');
                return;
            }
            value = numberToBigNumber(value);
            mogo.transfer(address,value,cbTransfer);
        },
        pausedChange: function () {
            if(this.changePaused!=this.paused){
                return;
            }else if(this.changePaused){
                mogo.unpause(cbTransfer);
            }else {
                mogo.pause(cbTransfer);
            }
        },
        fronzeAccount: function () {
            if(!web3.isAddress(address)){
                toastr.error('目标地址格式错误');
                return;
            }
            mogo.freezeAccount(this.freezeAddress,!this.fronze,cbTransfer);
        },
        changeOwner: function () {
            if(!web3.isAddress(address)){
                toastr.error('目标地址格式错误');
                return;
            }
            if(this.newOwnerAddress===this.owner){
                return;
            }
            mogo.transferOwnership(this.newOwnerAddress,cbTransfer);
        },
        addAddress:function () {
            var newAddress = new Object();
            newAddress.selected = this.allSelect;
            this.batchAddress.unshift(newAddress);
        },
        deleteAddress:function () {
            for (var i = this.batchAddress.length-1;i>=0;i--){
                if (this.batchAddress[i].selected){
                    this.batchAddress.splice(i,1);
                }
            }
        },
        aBatchTransfer:function () {
            var addresses=[];
            var balance = [];
            for (var i = 0;i<this.batchAddress.length;i++){
                if (this.batchAddress[i].selected){
                    this.batchAddress[i].isSend="已转账";
                    addresses.push(this.batchAddress[i].address);
                    balance.push(numberToBigNumber(this.batchAddress[i].value));
                }
            }
            if(addresses.length>100){
                toastr.error('批量转账数量不能100');
                return;
            }
            if(addresses.length==0){
                toastr.error('批量转账数量不能为0');
                return;
            }
            mogo.batchTransfer(addresses,balance,cbTransfer);
        },
        save:function () {
            var addressStr = JSON.stringify(this.batchAddress);
            var file = new File([addressStr], "addresses.json", {type: "text/plain;charset=utf-8"});
            saveAs(file);
        },
        load:function () {
            var files = $('#batchFile').prop('files');//获取到文件列表
            if(files.length == 0){
                toastr.error('请选择文件');
            }else {
                var reader = new FileReader();//新建一个FileReader
                reader.readAsText(files[0], "UTF-8");//读取文件
                reader.onload = function (evt) { //读取完文件之后会回来这里
                    content.batchAddress = JSON.parse(evt.target.result); // 读取文件内容
                    for (var i = content.batchAddress.length-1;i>=0;i--){
                        content.batchAddress[i].selected=content.allSelect;
                    }
                }
            }
        },
        changePage:function (index) {
            this.currentPage = index;
            this.refreshPage();
        },
        refreshPage:function () {
            var newPage = [];
            for (var i = (this.currentPage-1)*this.pageLength;i<Math.min(this.batchAddress.length,this.currentPage*this.pageLength);i++){
                newPage.push(this.batchAddress[i]);
            }
            this.cBatchAddress = newPage;
        }
    },
    watch:{
        targetValue: function (newValue,oldValue) {
            if(newValue<0){
                this.targetValue=0;
            }
        },
        freezeAddress: function (newValue,oldValue) {
            if(web3.isAddress(newValue)){
                mogo.frozenAccount(newValue,function (e,r) {
                    content.fronze = r;
                });
            }
        },
        allSelect: function (newValue,oldValue) {
            for (var i = this.batchAddress.length-1;i>=0;i--){
                this.batchAddress[i].selected=newValue;
            }
        },
        batchAddress:function (newValue,oldValue) {
            this.pageSize = Math.ceil(newValue.length/this.pageLength);
            if(this.pageSize==0){
                this.pageSize=1;
            }
            if(this.currentPage>this.pageSize){
                this.currentPage=this.pageSize;
            }

            this.refreshPage();
        }
    }
});

$.getJSON('addresses.json', function (data) {
    content.batchAddress=data;
});

$.getJSON('abi.json', function (data) {
    var contractABI = data;
    if(!web3){
        txhash.metamask=0;
        return;
    }
    if (contractABI != ''){
        var mogoContract = web3.eth.contract(contractABI);
        address = web3.eth.accounts[0]
        mogo = mogoContract.at("0x472eb1a4c31e4c6557feb00e90987e564ca412af");
        var result = mogo.owner.getData();
        console.log("result:"+result);
        loadTokenData();
    } else {
        console.log("api load error" );
    }
});

function cbTransfer(e,r) {
    if(e){
        toastr.error('请求失败,'+e);
        return;
    }
    txhash.lastTxhash = r;
    toastr.success('请求成功,txhash为'+r+',可在区块链浏览器查看交易');

}

function loadTokenData() {
    mogo.name(function (e,r) {
        content.tokenName = r;
    });
    mogo.totalSupply(function (e,r) {
        content.totalSupply = bigNumberToNumber(r);
    });
    mogo.paused(function (e,r) {
        content.paused = r;
        content.changePaused = !r;
    });
    mogo.symbol(function (e,r) {
        content.symbol = r;
    });
    mogo.owner(function (e,r) {
        content.owner = r;
        mogo.balanceOf(content.owner,function (e,r) {
            content.ownerBalance = bigNumberToNumber(r);
            content.circulate = content.totalSupply-content.ownerBalance;
        })
    })
}

function bigNumberToNumber(num) {
    var number = new BigNumber(num).toNumber();
    number = Math.floor(number / Math.pow(10, 14)) / 10000;
    ;
    return number;
}

function numberToBigNumber(num) {
    var number = new BigNumber(num);
    return number.mul(Math.pow(10, 18));
}

function isValid(address) {
    return /^0x[0-9a-fA-F]{40}$/i.test(address)
}

function export_raw(name, data) {
    var urlObject = window.URL || window.webkitURL || window;
    var export_blob = new Blob([data]);
    var save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
    save_link.href = urlObject.createObjectURL(export_blob);
    save_link.download = name;
}