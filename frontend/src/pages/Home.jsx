"use client";

import { useState, useEffect } from "react";
import {
	UserCircle,
	Home,
	FolderOpen,
	FileText,
	Calendar,
	Trash,
	HelpCircle,
	Settings,
	Clock,
	Plus,
	Check,
	ChevronDown,
	ChevronUp,
	X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

function Header() {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 10);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			className={`sticky top-0 z-10 w-full transition-all duration-300 ${
				scrolled ? "bg-[#0E98BA] shadow-md" : "bg-[#0E98BA]"
			}`}
		>
			<div className="px-4 py-3 flex justify-between items-center">
				<Link href="/" className="flex items-center gap-2">
					<Image
						src="/logo.png"
						width={100}
						height={100}
						className="h-10 w-10 text-white"
					/>
					<span className="text-4xl  text-black">Virgo</span>
				</Link>
				<div className="flex items-center">
					<button className="p-1 rounded-full hover:bg-white/10 transition-colors">
						<UserCircle className="h-8 w-8 text-black" />
					</button>
				</div>
			</div>
		</header>
	);
}

function NavItem({ icon, label, isActive, onClick }) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"flex items-center gap-3 px-6 py-3 mx-4 my-4 rounded-lg w-[90%] transition-all duration-200",
				isActive
					? "bg-[#D9D9D9]"
					: "hover:bg-[#0E98BA]/10 border border-[#d9d9d9]"
			)}
		>
			<div className="text-black">{icon}</div>
			<span className="text-2xl font-medium text-black">{label}</span>
		</button>
	);
}

function Sidebar() {
	const [activeItem, setActiveItem] = useState("Home");

	const topNavItems = [
		{ icon: <Home size={24} />, label: "Home" },
		{ icon: <FolderOpen size={24} />, label: "Collections" },
		{ icon: <FileText size={24} />, label: "Notes" },
		{ icon: <Calendar size={24} />, label: "Calendar" },
		{ icon: <Trash size={24} />, label: "Trash" },
	];

	const bottomNavItems = [
		{ icon: <HelpCircle size={24} />, label: "Help" },
		{ icon: <Settings size={24} />, label: "Settings" },
	];

	return (
		<aside className="h-[calc(100vh-64px)] border-r border-gray-200 flex flex-col justify-between py-2">
			<div className="space-y-1">
				{topNavItems.map((item) => (
					<NavItem
						key={item.label}
						icon={item.icon}
						label={item.label}
						isActive={activeItem === item.label}
						onClick={() => setActiveItem(item.label)}
					/>
				))}
			</div>

			<div className="space-y-1 mb-6">
				{bottomNavItems.map((item) => (
					<NavItem
						key={item.label}
						icon={item.icon}
						label={item.label}
						isActive={activeItem === item.label}
						onClick={() => setActiveItem(item.label)}
					/>
				))}
			</div>
		</aside>
	);
}

function EventsTable() {
	const [events] = useState([
		{
			id: "1",
			name: "Lecture 1",
			collection: "Subject 1",
			createdOn: "DD/MM/YY",
		},
		{
			id: "2",
			name: "Lecture 2",
			collection: "Subject 2",
			createdOn: "DD/MM/YY",
		},
		{
			id: "3",
			name: "Lecture 3",
			collection: "Subject 3",
			createdOn: "DD/MM/YY",
		},
		{
			id: "4",
			name: "Lecture 4",
			collection: "Subject 2",
			createdOn: "DD/MM/YY",
		},
	]);

	return (
		<div className="w-full overflow-x-auto">
			<table className="w-full caption-bottom text-sm">
				<thead className="[&_tr]:border-b">
					<tr className="border-b border-t border-[#0E98BA] transition-colors !text-2xl">
						<th className="h-12 px-2 text-left align-middle font-medium text-muted-foreground w-[40%]">
							Event
						</th>
						<th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground w-[30%]">
							Collection
						</th>
						<th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground w-[30%]">
							Created on
						</th>
					</tr>
				</thead>
				<tbody className="[&_tr:last-child]:border-0">
					{events.map((event) => (
						<tr
							key={event.id}
							className="transition-colors hover:bg-gray-50 cursor-pointer text-lg"
						>
							<td className="p-2 pt-4 align-middle font-medium">
								{event.name}
							</td>
							<td className="p-2 align-middle">{event.collection}</td>
							<td className="p-2 align-middle">{event.createdOn}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function Dialog({ open, onOpenChange, children }) {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50">
			<div
				className="fixed inset-0 bg-black/80"
				onClick={() => onOpenChange(false)}
			/>
			<div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
				{children}
				<button
					onClick={() => onOpenChange(false)}
					className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
				>
					<X className="h-4 w-4" />
					<span className="sr-only">Close</span>
				</button>
			</div>
		</div>
	);
}

function MainContent() {
	const [newEventOpen, setNewEventOpen] = useState(false);
	const [scheduleOpen, setScheduleOpen] = useState(false);

	const router = useRouter();

	return (
		<div className="p-6 space-y-8">
			<div className="flex items-center gap-8">
				<div className="rounded-lg border border-[#D7D7D7] bg-white p-6 px-20 space-y-4 ">
					<h3 className="text-4xl ">Record New Event</h3>
					<button
						onClick={() => router.push("/record")}
						className="flex items-center justify-center rounded-md text-xl font-medium bg-[#0E98BA] hover:bg-[#0A7A96] text-white h-10 px-4 py-2 mx-auto !cursor-pointer"
					>
						<Plus className="mr-2 h-6 w-6" /> New Event
					</button>
				</div>

				<div className="rounded-lg border border-[#D7D7D7] bg-white p-6 px-20 space-y-4 cursor-pointer">
					<h3 className="text-4xl">Schedule an Event</h3>
					<button
						onClick={() => setScheduleOpen(true)}
						className="flex items-center justify-center rounded-md text-xl font-medium bg-[#0E98BA] hover:bg-[#0A7A96] text-white h-10 px-4 py-2 mx-auto"
					>
						<Clock className="mr-2 h-6 w-6" /> Schedule
					</button>
				</div>

				<Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
					<div>
						<div className="flex flex-col space-y-1.5 text-center sm:text-left">
							<h2 className="text-lg font-semibold">Create New Event</h2>
						</div>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<label className="text-sm font-medium leading-none">
									Event Name
								</label>
								<input
									className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
									placeholder="Enter event name"
								/>
							</div>
							<div className="grid gap-2">
								<label className="text-sm font-medium leading-none">
									Collection
								</label>
								<select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
									<option value="">Select a collection</option>
									<option value="subject1">Subject 1</option>
									<option value="subject2">Subject 2</option>
									<option value="subject3">Subject 3</option>
								</select>
							</div>
							<div className="grid gap-2">
								<label className="text-sm font-medium leading-none">
									Notes
								</label>
								<textarea
									className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									placeholder="Add notes here..."
								/>
							</div>
						</div>
						<div className="flex justify-end">
							<button
								className="bg-[#0E98BA] hover:bg-[#0A7A96] text-white h-10 px-4 py-2 rounded-md text-sm font-medium"
								onClick={() => setNewEventOpen(false)}
							>
								Create Event
							</button>
						</div>
					</div>
				</Dialog>

				<Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
					<div>
						<div className="flex flex-col space-y-1.5 text-center sm:text-left">
							<h2 className="text-lg font-semibold">Schedule Event</h2>
						</div>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<label className="text-sm font-medium leading-none">
									Event
								</label>
								<select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
									<option value="">Select an event</option>
									<option value="lecture1">Lecture 1</option>
									<option value="lecture2">Lecture 2</option>
									<option value="lecture3">Lecture 3</option>
								</select>
							</div>
							<div className="grid gap-2">
								<label className="text-sm font-medium leading-none">Date</label>
								<input
									type="date"
									className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								/>
							</div>
							<div className="grid gap-2">
								<label className="text-sm font-medium leading-none">Time</label>
								<input
									type="time"
									className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								/>
							</div>
						</div>
						<div className="flex justify-end">
							<button
								className="bg-[#0E98BA] hover:bg-[#0A7A96] text-white h-10 px-4 py-2 rounded-md text-sm font-medium"
								onClick={() => setScheduleOpen(false)}
							>
								Schedule
							</button>
						</div>
					</div>
				</Dialog>
			</div>

			<div className="mt-8">
				{/* <h2 className="text-4xl mb-4">Recent Events</h2> */}
				<EventsTable />
			</div>
		</div>
	);
}

export default function HomePage() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			<div className="grid grid-cols-[18%_auto]">
				<div className=" hidden md:block">
					<Sidebar />
				</div>
				<div className="flex-1 overflow-y-auto">
					<MainContent />
				</div>
			</div>
		</div>
	);
}
