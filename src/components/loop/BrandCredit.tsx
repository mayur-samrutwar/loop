import Image from 'next/image';

export function BrandCredit() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <span className="text-[11px] font-normal text-stone-400">by</span>
      <Image
        src="/isaacprotocol.jpg"
        alt="Isaac Protocol"
        width={384}
        height={96}
        className="h-auto w-[132px] object-contain opacity-65"
      />
    </div>
  );
}

