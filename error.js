load = async () => {
    const comptrollerError = {
        0: 'NO_ERROR',
        1: 'UNAUTHORIZED',
        2: 'COMPTROLLER_MISMATCH',
        3: 'INSUFFICIENT_SHORTFALL',
        4: 'INSUFFICIENT_LIQUIDITY',
        5: 'INVALID_CLOSE_FACTOR',
        6: 'INVALID_COLLATERAL_FACTOR',
        7: 'INVALID_LIQUIDATION_INCENTIVE',
        8: 'MARKET_NOT_ENTERED', // no longer possible
        9: 'MARKET_NOT_LISTED',
        10: 'MARKET_ALREADY_LISTED',
        11: 'MATH_ERROR',
        12: 'NONZERO_BORROW_BALANCE',
        13: 'PRICE_ERROR',
        14: 'REJECTION',
        15: 'SNAPSHOT_ERROR',
        16: 'TOO_MANY_ASSETS',
        17: 'TOO_MUCH_REPAY',
    };

    const comtrollerFailureInfo = {
        0: 'ACCEPT_ADMIN_PENDING_ADMIN_CHECK',
        1: 'ACCEPT_PENDING_IMPLEMENTATION_ADDRESS_CHECK',
        2: 'EXIT_MARKET_BALANCE_OWED',
        3: 'EXIT_MARKET_REJECTION',
        4: 'SET_CLOSE_FACTOR_OWNER_CHECK',
        5: 'SET_CLOSE_FACTOR_VALIDATION',
        6: 'SET_COLLATERAL_FACTOR_OWNER_CHECK',
        7: 'SET_COLLATERAL_FACTOR_NO_EXISTS',
        8: 'SET_COLLATERAL_FACTOR_VALIDATION',
        9: 'SET_COLLATERAL_FACTOR_WITHOUT_PRICE',
        10: 'SET_IMPLEMENTATION_OWNER_CHECK',
        11: 'SET_LIQUIDATION_INCENTIVE_OWNER_CHECK',
        12: 'SET_LIQUIDATION_INCENTIVE_VALIDATION',
        13: 'SET_MAX_ASSETS_OWNER_CHECK',
        14: 'SET_PENDING_ADMIN_OWNER_CHECK',
        15: 'SET_PENDING_IMPLEMENTATION_OWNER_CHECK',
        16: 'SET_PRICE_ORACLE_OWNER_CHECK',
        17: 'SUPPORT_MARKET_EXISTS',
        18: 'SUPPORT_MARKET_OWNER_CHECK',
        19: 'SET_PAUSE_GUARDIAN_OWNER_CHECK',
    };

    const tokenError = {
        0: 'NO_ERROR',
        1: 'UNAUTHORIZED',
        2: 'BAD_INPUT',
        3: 'COMPTROLLER_REJECTION',
        4: 'COMPTROLLER_CALCULATION_ERROR',
        5: 'INTEREST_RATE_MODEL_ERROR',
        6: 'INVALID_ACCOUNT_PAIR',
        7: 'INVALID_CLOSE_AMOUNT_REQUESTED',
        8: 'INVALID_COLLATERAL_FACTOR',
        9: 'MATH_ERROR',
        10: 'MARKET_NOT_FRESH',
        11: 'MARKET_NOT_LISTED',
        12: 'TOKEN_INSUFFICIENT_ALLOWANCE',
        13: 'TOKEN_INSUFFICIENT_BALANCE',
        14: 'TOKEN_INSUFFICIENT_CASH',
        15: 'TOKEN_TRANSFER_IN_FAILED',
        16: 'TOKEN_TRANSFER_OUT_FAILED',
    };

    const tokenFailureInfo = {
        0: 'ACCEPT_ADMIN_PENDING_ADMIN_CHECK',
        1: 'ACCRUE_INTEREST_ACCUMULATED_INTEREST_CALCULATION_FAILED',
        2: 'ACCRUE_INTEREST_BORROW_RATE_CALCULATION_FAILED',
        3: 'ACCRUE_INTEREST_NEW_BORROW_INDEX_CALCULATION_FAILED',
        4: 'ACCRUE_INTEREST_NEW_TOTAL_BORROWS_CALCULATION_FAILED',
        5: 'ACCRUE_INTEREST_NEW_TOTAL_RESERVES_CALCULATION_FAILED',
        6: 'ACCRUE_INTEREST_SIMPLE_INTEREST_FACTOR_CALCULATION_FAILED',
        7: 'BORROW_ACCUMULATED_BALANCE_CALCULATION_FAILED',
        8: 'BORROW_ACCRUE_INTEREST_FAILED',
        9: 'BORROW_CASH_NOT_AVAILABLE',
        10: 'BORROW_FRESHNESS_CHECK',
        11: 'BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED',
        12: 'BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED',
        13: 'BORROW_MARKET_NOT_LISTED',
        14: 'BORROW_COMPTROLLER_REJECTION',
        15: 'LIQUIDATE_ACCRUE_BORROW_INTEREST_FAILED',
        16: 'LIQUIDATE_ACCRUE_COLLATERAL_INTEREST_FAILED',
        17: 'LIQUIDATE_COLLATERAL_FRESHNESS_CHECK',
        18: 'LIQUIDATE_COMPTROLLER_REJECTION',
        19: 'LIQUIDATE_COMPTROLLER_CALCULATE_AMOUNT_SEIZE_FAILED',
        20: 'LIQUIDATE_CLOSE_AMOUNT_IS_UINT_MAX',
        21: 'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO',
        22: 'LIQUIDATE_FRESHNESS_CHECK',
        23: 'LIQUIDATE_LIQUIDATOR_IS_BORROWER',
        24: 'LIQUIDATE_REPAY_BORROW_FRESH_FAILED',
        25: 'LIQUIDATE_SEIZE_BALANCE_INCREMENT_FAILED',
        26: 'LIQUIDATE_SEIZE_BALANCE_DECREMENT_FAILED',
        27: 'LIQUIDATE_SEIZE_COMPTROLLER_REJECTION',
        28: 'LIQUIDATE_SEIZE_LIQUIDATOR_IS_BORROWER',
        29: 'LIQUIDATE_SEIZE_TOO_MUCH',
        30: 'MINT_ACCRUE_INTEREST_FAILED',
        31: 'MINT_COMPTROLLER_REJECTION',
        32: 'MINT_EXCHANGE_CALCULATION_FAILED',
        33: 'MINT_EXCHANGE_RATE_READ_FAILED',
        34: 'MINT_FRESHNESS_CHECK',
        35: 'MINT_NEW_ACCOUNT_BALANCE_CALCULATION_FAILED',
        36: 'MINT_NEW_TOTAL_SUPPLY_CALCULATION_FAILED',
        37: 'MINT_TRANSFER_IN_FAILED',
        38: 'MINT_TRANSFER_IN_NOT_POSSIBLE',
        39: 'REDEEM_ACCRUE_INTEREST_FAILED',
        40: 'REDEEM_COMPTROLLER_REJECTION',
        41: 'REDEEM_EXCHANGE_TOKENS_CALCULATION_FAILED',
        42: 'REDEEM_EXCHANGE_AMOUNT_CALCULATION_FAILED',
        43: 'REDEEM_EXCHANGE_RATE_READ_FAILED',
        44: 'REDEEM_FRESHNESS_CHECK',
        45: 'REDEEM_NEW_ACCOUNT_BALANCE_CALCULATION_FAILED',
        46: 'REDEEM_NEW_TOTAL_SUPPLY_CALCULATION_FAILED',
        47: 'REDEEM_TRANSFER_OUT_NOT_POSSIBLE',
        48: 'REDUCE_RESERVES_ACCRUE_INTEREST_FAILED',
        49: 'REDUCE_RESERVES_ADMIN_CHECK',
        51: 'REDUCE_RESERVES_CASH_NOT_AVAILABLE',
        52: 'REDUCE_RESERVES_FRESH_CHECK',
        53: 'REDUCE_RESERVES_VALIDATION',
        54: 'REPAY_BEHALF_ACCRUE_INTEREST_FAILED',
        55: 'REPAY_BORROW_ACCRUE_INTEREST_FAILED',
        56: 'REPAY_BORROW_ACCUMULATED_BALANCE_CALCULATION_FAILED',
        57: 'REPAY_BORROW_COMPTROLLER_REJECTION',
        58: 'REPAY_BORROW_FRESHNESS_CHECK',
        59: 'REPAY_BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED',
        60: 'REPAY_BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED',
        61: 'REPAY_BORROW_TRANSFER_IN_NOT_POSSIBLE',
        62: 'SET_COLLATERAL_FACTOR_OWNER_CHECK',
        63: 'SET_COLLATERAL_FACTOR_VALIDATION',
        64: 'SET_COMPTROLLER_OWNER_CHECK',
        65: 'SET_INTEREST_RATE_MODEL_ACCRUE_INTEREST_FAILED',
        66: 'SET_INTEREST_RATE_MODEL_FRESH_CHECK',
        67: 'SET_INTEREST_RATE_MODEL_OWNER_CHECK',
        68: 'SET_MAX_ASSETS_OWNER_CHECK',
        69: 'SET_ORACLE_MARKET_NOT_LISTED',
        70: 'SET_PENDING_ADMIN_OWNER_CHECK',
        71: 'SET_RESERVE_FACTOR_ACCRUE_INTEREST_FAILED',
        72: 'SET_RESERVE_FACTOR_ADMIN_CHECK',
        73: 'SET_RESERVE_FACTOR_FRESH_CHECK',
        74: 'SET_RESERVE_FACTOR_BOUNDS_CHECK',
        75: 'TRANSFER_COMPTROLLER_REJECTION',
        76: 'TRANSFER_NOT_ALLOWED',
        77: 'TRANSFER_NOT_ENOUGH',
        78: 'TRANSFER_TOO_MUCH',
        79: 'ADD_RESERVES_ACCRUE_INTEREST_FAILED',
        80: 'ADD_RESERVES_FRESH_CHECK',
        81: 'ADD_RESERVES_TRANSFER_IN_NOT_POSSIBLE',
        82: 'ADD_SUBSIDY_FUND_FAILED',
        83: 'ADD_SUBSIDY_FUND_FRESH_CHECK',
    };

    comptroller.on('Failure', (error, info, detail) => {
        console.log('=== Comptroller Failure ===');
        console.log(`Error: ${comptrollerError[error]}`);
        console.log(`Info: ${comtrollerFailureInfo[info]}`);
        console.log(`Detail: ${detail} | (Check the associated detail) | ${comptrollerError[detail]}`);
        console.log('===========================');
    });

    crif.on('TokenFailure', (error, info, detail) => {
        console.log('=== cRIF Failure ===');
        console.log(`Error: ${tokenError[error]}`);
        console.log(`Info: ${tokenFailureInfo[info]}`);
        console.log(`Detail: ${detail} | (Check the associated detail) | ${comptrollerError[detail]}`);
        console.log('===========================');
    });

    cdoc.on('TokenFailure', (error, info, detail) => {
        console.log('=== cDOC Failure ===');
        console.log(`Error: ${tokenError[error]}`);
        console.log(`Info: ${tokenFailureInfo[info]}`);
        console.log(`Detail: ${detail} | (Check the associated detail) | ${comptrollerError[detail]}`);
        console.log('===========================');
    });

    cusdt.on('TokenFailure', (error, info, detail) => {
        console.log('=== cUSDT Failure ===');
        console.log(`Error: ${tokenError[error]}`);
        console.log(`Info: ${tokenFailureInfo[info]}`);
        console.log(`Detail: ${detail} | (Check the associated detail) | ${comptrollerError[detail]}`);
        console.log('===========================');
    });

    crbtc.on('TokenFailure', (error, info, detail) => {
        console.log('=== crBTC Failure ===');
        console.log(`Error: ${tokenError[error]}`);
        console.log(`Info: ${tokenFailureInfo[info]}`);
        console.log(`Detail: ${detail} | (Check the associated detail) | ${comptrollerError[detail]}`);
        console.log('===========================');
    });

    cdoc.on('Mint', (minter, mintAmount, mintTokens) => {
        console.log('=== CDOC Mint ===');
        console.log(`Minter: ${minter}`);
        console.log(`Mint Amount: ${Number(mintAmount)/1e18}`);
        console.log(`CDOCs Minted: ${Number(mintTokens)/1e18}`);
        console.log('===========================');
    })
};

load();
