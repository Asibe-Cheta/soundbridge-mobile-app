// Stub for @stripe/stripe-react-native's NativeOnrampSdkModule.
// The real module requires 'OnrampSdk' to be compiled into the native binary.
// SoundBridge does not use Stripe's crypto on-ramp feature, so all methods are
// safe no-ops that let Stripe initialise without crashing.
//
// IMPORTANT: onCheckoutClientSecretRequested must be a function (not null).
// When it's null, Stripe's events.js falls back to `new NativeEventEmitter(module)`
// which fails when the native module isn't registered. As a function it is called
// directly by addOnrampListener and we return a removable subscription stub.

const noop = () => {};
const asyncNoop = () => Promise.resolve(null);
const subscription = { remove: noop };
const eventStub = (handler) => subscription;

const OnrampSdkStub = {
  // Event handler — must be a function so Stripe skips the NativeEventEmitter path
  onCheckoutClientSecretRequested: eventStub,

  // NativeEventEmitter compatibility (addListener / removeListeners)
  addListener: noop,
  removeListeners: noop,

  // Lifecycle
  initialise: asyncNoop,

  // Onramp session
  configureOnramp: asyncNoop,
  performCheckout: asyncNoop,
  provideCheckoutClientSecret: noop,

  // Auth / identity
  hasLinkAccount: asyncNoop,
  registerLinkUser: asyncNoop,
  registerWalletAddress: asyncNoop,
  attachKycInfo: asyncNoop,
  presentKycInfoVerification: asyncNoop,
  authenticateUserWithToken: asyncNoop,
  authenticateUser: asyncNoop,
  verifyIdentity: asyncNoop,
  updatePhoneNumber: asyncNoop,
  onrampAuthorize: asyncNoop,

  // Payment / crypto
  collectPaymentMethod: asyncNoop,
  createCryptoPaymentToken: asyncNoop,
  getCryptoTokenDisplayData: asyncNoop,

  // Session end
  logout: asyncNoop,
};

export default OnrampSdkStub;
