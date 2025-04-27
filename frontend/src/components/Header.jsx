import Image from "next/image";
import React from "react";

function Header({ full }) {
	return (
		<div className="bg-[#0E98BA] flex px-10 gap-2 items-center justify-between h-16 ">
			<div className="flex gap-2 items-center">
				<Image
					src="/logo.png"
					alt="Logo"
					width={1000}
					height={500}
					className=" w-10 h-10"
				/>
				<p className="text-4xl text-black">Virgo</p>
			</div>
			<div>
				<Image
					src="/user_icon.png"
					alt="User Icon"
					width={1000}
					height={500}
					className="w-10 h-10"
				/>
			</div>
		</div>
	);
}

export default Header;
