interface Window {
  ethereum?: any;
}

interface CustomEventDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  detail: CustomEventDetail;
} 