import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';
import { encodedNumber } from '../Encoding';

interface PriceOracleAdapterCompoundethodsMethods {
  setPriceProvider(priceProviderAddress: string): Sendable<number>
  setKeyOracle(cTokenAddress: string, keyOracle: string): Sendable<number>
}

export interface PriceOracleAdapterCompound extends Contract {
  methods: PriceOracleAdapterCompoundethodsMethods
}
