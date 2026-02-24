"use client";

import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { ClusterProperties, PointFeature } from "supercluster";
import useSupercluster from "use-supercluster";
import {
	IconCircleInfoSparkle,
	IconExternalLink,
	IconUTurnToLeft,
} from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listNegotiationsMeWithCoordinates } from "@/lib/api/client";
import type { ApiNegotiation, SpancoStage } from "@/lib/api/types";
import { useAuthOptional } from "@/lib/auth/auth-context";
import { usePreferencesOptional } from "@/lib/preferences/preferences-context";
import { getNegotiationStatoSegment } from "@/lib/trattative-utils";
/** Mapbox GL CSS must be imported for proper rendering. */
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * Mapbox Standard style supports fog, rain, snow and light presets.
 * We use lightPreset via setConfigProperty for theme-aware basemap.
 * @see https://docs.mapbox.com/style-spec/reference/fog/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/rain/
 */
const MAP_STYLE_STANDARD = "mapbox://styles/mapbox/standard";

/**
 * Atmospheric effect colors aligned with app theme.
 * Hex values approximate the theme CSS variables (background, card, sidebar tints).
 * @see https://docs.mapbox.com/style-spec/reference/fog/
 * @see https://docs.mapbox.com/style-spec/reference/rain/
 * @see https://docs.mapbox.com/style-spec/reference/snow/
 */
type ThemeVariant =
	| "light-default"
	| "light-rich"
	| "dark-default"
	| "dark-rich";

const ATMOSPHERIC_COLORS: Record<
	ThemeVariant,
	{
		fog: { color: string; "high-color": string; "space-color": string };
		rain: { color: string; "vignette-color": string };
		snow: { color: string; "vignette-color": string };
	}
> = {
	"light-default": {
		fog: {
			color: "#f8fafc",
			"high-color": "#e2e8f0",
			"space-color": "#f1f5f9",
		},
		rain: { color: "#94a3b8", "vignette-color": "#64748b" },
		snow: { color: "#f8fafc", "vignette-color": "#e2e8f0" },
	},
	"light-rich": {
		fog: {
			color: "#e8f0fa",
			"high-color": "#b8d4f0",
			"space-color": "#d0e4f8",
		},
		rain: { color: "#94a3b8", "vignette-color": "#5b7db5" },
		snow: { color: "#f0f6ff", "vignette-color": "#c5dcf5" },
	},
	"dark-default": {
		fog: {
			color: "#1e293b",
			"high-color": "#334155",
			"space-color": "#0f172a",
		},
		rain: { color: "#64748b", "vignette-color": "#475569" },
		snow: { color: "#e2e8f0", "vignette-color": "#64748b" },
	},
	"dark-rich": {
		fog: {
			color: "#1a2332",
			"high-color": "#2d3f5f",
			"space-color": "#0d1520",
		},
		rain: { color: "#64748b", "vignette-color": "#2a3655" },
		snow: { color: "#e2e8f0", "vignette-color": "#334155" },
	},
};

/** Mapbox Standard lightPreset values for time-of-day lighting. */
type LightPreset = "dawn" | "day" | "dusk" | "night";

/**
 * Returns the Mapbox lightPreset based on current local time.
 * Dawn 5-7, Day 7-17, Dusk 17-20, Night 20-5.
 */
function getLightPresetForTime(date: Date = new Date()): LightPreset {
	const hour = date.getHours();
	if (hour >= 5 && hour < 7) {
		return "dawn";
	}
	if (hour >= 7 && hour < 17) {
		return "day";
	}
	if (hour >= 17 && hour < 20) {
		return "dusk";
	}
	return "night";
}

/** Format importo as EUR for tooltip. */
function formatImporto(value: number): string {
	return new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

/** Single marker size in px: larger when zoomed in for better visibility. */
function singleMarkerSizePx(zoom: number): number {
	if (zoom >= 13) {
		return 28;
	}
	if (zoom >= 11) {
		return 22;
	}
	return 18;
}

/** Italy center (Rome) — default view for negotiations map. */
const ITALY_CENTER = {
	longitude: 12.4964,
	latitude: 41.9028,
	zoom: 5,
} as const;

/** Spanco colors aligned with chart and table — for marker styling. */
const SPANCO_MARKER_COLORS: Record<SpancoStage, string> = {
	S: "oklch(0.5575 0.0165 244.89)",
	P: "oklch(0.6994 0.1754 51.79)",
	A: "oklch(0.8114 0.1654 84.92)",
	N: "oklch(0.5782 0.2282 260.03)",
	C: "oklch(0.5915 0.202 21.24)",
	O: "oklch(0.5315 0.1179 157.23)",
};

/** Properties for each point in the map — negotiation id, spanco, client info for marker and tooltip. */
interface NegotiationPointProperties {
	negotiationId: number;
	spanco: SpancoStage;
	abbandonata: boolean;
	percentuale: number;
	clientName?: string;
	referente?: string;
	citta?: string;
	telefono?: string | null;
	importo?: number;
}

/**
 * Build GeoJSON Point features from negotiations that have valid coordinates.
 * Skips entries where client.address lacks latitude/longitude or geocoding_failed is true.
 */
function negotiationsToPoints(
	negotiations: ApiNegotiation[]
): PointFeature<NegotiationPointProperties>[] {
	const points: PointFeature<NegotiationPointProperties>[] = [];

	for (const n of negotiations) {
		const lat = n.client?.address?.latitude;
		const lng = n.client?.address?.longitude;

		if (
			typeof lat !== "number" ||
			typeof lng !== "number" ||
			n.client?.address?.geocoding_failed
		) {
			continue;
		}

		points.push({
			type: "Feature",
			properties: {
				negotiationId: n.id,
				spanco: n.spanco,
				abbandonata: Boolean(n.abbandonata),
				percentuale: n.percentuale ?? 0,
				clientName: n.client?.ragione_sociale,
				referente: n.referente,
				citta: n.client?.address?.citta ?? undefined,
				telefono: n.client?.telefono ?? null,
				importo: n.importo,
			},
			geometry: {
				type: "Point",
				coordinates: [lng, lat],
			},
			id: n.id,
		});
	}

	return points;
}

/**
 * Mapbox Map instance with atmospheric effect APIs (fog, terrain, 3D).
 * These are available in Mapbox GL JS v3.9+.
 */
interface MapboxMapWithAtmosphere {
	getBounds: () => {
		getWest: () => number;
		getSouth: () => number;
		getEast: () => number;
		getNorth: () => number;
	} | null;
	getZoom: () => number;
	flyTo: (opts: {
		center: [number, number];
		zoom: number;
		pitch?: number;
		bearing?: number;
	}) => void;
	on?: (event: string, cb: () => void) => void;
	off?: (event: string, cb: () => void) => void;
	setConfigProperty?: (
		layerName: string,
		property: string,
		value: string | boolean
	) => void;
	setFog?: (fog: Record<string, unknown>) => void;
}

/** Inner map content — rendered only when Mapbox token is available. */
function NegotiationsMapInner({
	accessToken,
}: {
	accessToken: string;
}): ReactNode {
	// Store map instance from onLoad for imperative calls (flyTo, atmospheric effects).
	const mapInstanceRef = useRef<MapboxMapWithAtmosphere | null>(null);
	const [negotiations, setNegotiations] = useState<ApiNegotiation[]>([]);
	const [mapError, setMapError] = useState<string | null>(null);
	const [isMapLoading, setIsMapLoading] = useState(true);
	const [bounds, setBounds] = useState<[number, number, number, number] | null>(
		null
	);
	const [zoom, setZoom] = useState<number>(ITALY_CENTER.zoom);

	const router = useRouter();
	const auth = useAuthOptional();
	const { resolvedTheme } = useTheme();
	const preferences = usePreferencesOptional();

	// Resolve theme: light or dark (system resolves via resolvedTheme).
	const isDark = resolvedTheme === "dark";
	const colorScheme = preferences?.colorScheme ?? "default";
	const themeVariant = ((isDark ? "dark-" : "light-") +
		(colorScheme === "rich" ? "rich" : "default")) as ThemeVariant;

	// Map style: Standard supports fog/rain/snow and lightPreset for theme.
	const mapStyle = MAP_STYLE_STANDARD;
	const colors = ATMOSPHERIC_COLORS[themeVariant];

	// Fetch negotiations with coordinates from API
	useEffect(() => {
		if (!auth?.token) {
			setNegotiations([]);
			setMapError(null);
			setIsMapLoading(false);
			return;
		}

		let cancelled = false;
		setIsMapLoading(true);
		setMapError(null);

		listNegotiationsMeWithCoordinates(auth.token).then((result) => {
			if (cancelled) {
				return;
			}

			if ("error" in result) {
				setNegotiations([]);
				setMapError(result.error);
			} else {
				setNegotiations(result.data);
				setMapError(null);
			}
			setIsMapLoading(false);
		});

		return () => {
			cancelled = true;
		};
	}, [auth?.token]);

	const points = useMemo(
		() => negotiationsToPoints(negotiations),
		[negotiations]
	);

	// Mapbox Map events pass the map as event.target — store for bounds/zoom, flyTo, atmospheric effects.
	interface MapboxEvent {
		target: MapboxMapWithAtmosphere;
	}

	/**
	 * Apply 3D lighting, terrain, atmosphere (fog). Rain and snow are disabled.
	 * Mapbox GL JS v3.9+ supports setFog, setTerrain, setConfigProperty.
	 * Light preset: dark theme always "night"; light theme varies by time of day (dawn/day/dusk/night).
	 */
	const applyAtmosphericEffects = useCallback(
		(map: MapboxMapWithAtmosphere | null | undefined) => {
			if (!map || typeof map.setConfigProperty !== "function") {
				return;
			}
			try {
				// 3D lighting: show 3D objects with shadows, ambient occlusion, flood lights.
				map.setConfigProperty("basemap", "show3dObjects", true);

				// Light theme: preset varies by time (dawn 5-7, day 7-17, dusk 17-20, night 20-5).
				// Dark theme: always night for consistent dark basemap.
				const lightPreset: LightPreset = isDark
					? "night"
					: getLightPresetForTime();
				map.setConfigProperty("basemap", "lightPreset", lightPreset);

				// Fog: atmospheric depth, theme-matched colors (globe atmosphere).
				map.setFog?.({
					range: [0.5, 10],
					"horizon-blend": 0.3,
					color: colors.fog.color,
					"high-color": colors.fog["high-color"],
					"space-color": colors.fog["space-color"],
					"star-intensity": 0,
				});

				// Rain and snow disabled per user preference.
			} catch {
				// Map may be destroyed or style not yet loaded; skip atmospheric effects.
			}
		},
		[colors, isDark]
	);

	const updateBoundsFromMap = useCallback(
		(map: MapboxMapWithAtmosphere, applyEffects: boolean) => {
			mapInstanceRef.current = map;
			const b = map.getBounds();
			if (b) {
				setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
			}
			setZoom(map.getZoom());
			if (applyEffects) {
				applyAtmosphericEffects(map);
			}
		},
		[applyAtmosphericEffects]
	);

	// Ref to always use latest atmospheric config when style reloads (e.g. theme switch).
	const applyEffectsRef = useRef(applyAtmosphericEffects);
	applyEffectsRef.current = applyAtmosphericEffects;

	// Re-apply fog, rain, snow, and lightPreset when theme or color scheme changes.
	// (style.load fires only when mapStyle URL changes; we use the same style, so we react to theme here.)
	useEffect(() => {
		const map = mapInstanceRef.current;
		if (map) {
			applyAtmosphericEffects(map);
		}
	}, [applyAtmosphericEffects]);

	// Update light preset periodically (every 15 min) so map reflects time-of-day changes.
	useEffect(() => {
		const intervalId = setInterval(
			() => {
				const map = mapInstanceRef.current;
				if (map) {
					applyEffectsRef.current?.(map);
				}
			},
			15 * 60 * 1000
		);
		return () => clearInterval(intervalId);
	}, []);

	const handleMapLoad = useCallback(
		(e: MapboxEvent) => {
			const map = e.target;
			updateBoundsFromMap(map, true);

			// Add 3D terrain and re-apply effects when style loads.
			// Terrain requires mapbox-dem source; setTerrain uses it for elevation.
			// Cast to access Mapbox Map APIs not in our minimal interface.
			const mapWithTerrain = map as {
				getSource?: (id: string) => unknown;
				addSource?: (id: string, source: object) => void;
				setTerrain?: (terrain: {
					source: string;
					exaggeration?: number;
				}) => void;
			};
			const onStyleLoad = () => {
				try {
					if (!mapWithTerrain.getSource?.("mapbox-dem")) {
						mapWithTerrain.addSource?.("mapbox-dem", {
							type: "raster-dem",
							url: "mapbox://mapbox.mapbox-terrain-dem-v1",
							tileSize: 512,
							maxzoom: 14,
						});
					}
					mapWithTerrain.setTerrain?.({
						source: "mapbox-dem",
						exaggeration: 1.5,
					});
				} catch {
					// Source may already exist or style not ready.
				}
				applyEffectsRef.current?.(map);
			};
			map.on?.("style.load", onStyleLoad);
			// Run once immediately (style may already be loaded on initial map load).
			onStyleLoad();

			// Cleanup: Mapbox map is destroyed when Map unmounts; no explicit off needed for our use case.
		},
		[updateBoundsFromMap]
	);

	const handleMoveEnd = useCallback(
		(e: MapboxEvent) => updateBoundsFromMap(e.target, false),
		[updateBoundsFromMap]
	);

	const { clusters, supercluster } = useSupercluster<
		NegotiationPointProperties,
		ClusterProperties & { point_count: number }
	>({
		points,
		bounds: bounds ?? undefined,
		zoom,
		options: { radius: 60, maxZoom: 16 },
	});

	// Track hovered marker/cluster so we can bring it on top — tooltip must always be above others.
	const [hoveredClusterId, setHoveredClusterId] = useState<
		string | number | null
	>(null);
	/** Tooltip placement: 'above' when there's space, 'below' when marker is near top of container. */
	const [tooltipPlacement, setTooltipPlacement] = useState<"above" | "below">(
		"above"
	);
	// Show reset button only after user zoomed in on a marker/cluster.
	const [showResetButton, setShowResetButton] = useState(false);
	const mapContainerRef = useRef<HTMLDivElement>(null);

	/** On marker hover, compute tooltip placement: below when not enough space above. */
	const handleMarkerMouseEnter = useCallback(
		(e: React.MouseEvent<HTMLElement>, clusterId: string | number) => {
			const container = mapContainerRef.current;
			if (!container) {
				setHoveredClusterId(clusterId);
				setTooltipPlacement("above");
				return;
			}
			const markerRect = e.currentTarget.getBoundingClientRect();
			const containerRect = container.getBoundingClientRect();
			const spaceAbove = markerRect.top - containerRect.top;
			const minSpaceForTooltip = 100;
			const placement = spaceAbove < minSpaceForTooltip ? "below" : "above";
			setHoveredClusterId(clusterId);
			setTooltipPlacement(placement);
		},
		[]
	);

	// Reorder clusters so the hovered one renders last (on top). Mapbox markers respect DOM order.
	const sortedClusters = useMemo(() => {
		if (hoveredClusterId == null) {
			return clusters;
		}
		const idx = clusters.findIndex((c) => c.id === hoveredClusterId);
		if (idx < 0) {
			return clusters;
		}
		const rest = clusters.filter((c) => c.id !== hoveredClusterId);
		const hovered = clusters[idx];
		return [...rest, hovered];
	}, [clusters, hoveredClusterId]);

	// Dynamic import to avoid SSR issues with mapbox-gl
	const MapboxMap = useMemo(
		() =>
			dynamic(() => import("react-map-gl/mapbox").then((mod) => mod.default), {
				ssr: false,
			}),
		[]
	);

	const Marker = useMemo(
		() =>
			dynamic(() => import("react-map-gl/mapbox").then((mod) => mod.Marker), {
				ssr: false,
			}),
		[]
	);

	const handleResetView = useCallback(() => {
		const map = mapInstanceRef.current;
		if (map?.flyTo) {
			map.flyTo({
				center: [ITALY_CENTER.longitude, ITALY_CENTER.latitude],
				zoom: ITALY_CENTER.zoom,
				pitch: 0,
				bearing: 0,
			});
			setShowResetButton(false);
		}
	}, []);

	if (mapError) {
		return (
			<div className="flex h-[360px] w-full items-center justify-center rounded-xl border border-muted border-dashed bg-muted/20 p-4 text-center sm:h-[440px] md:h-[520px]">
				<p className="text-destructive text-sm">{mapError}</p>
			</div>
		);
	}

	return (
		<div
			className="relative h-[360px] w-full shrink-0 overflow-hidden rounded-xl border border-border p-2 sm:h-[440px] md:h-[520px]"
			ref={mapContainerRef}
		>
			{/* Reset view button: only visible after zooming in on a marker. */}
			<AnimatePresence>
				{showResetButton && (
					<motion.div
						animate={{ opacity: 1, scale: 1, x: 0 }}
						className="group/button absolute top-4 left-4 z-10"
						exit={{ opacity: 0, scale: 0.9, x: -8 }}
						initial={{ opacity: 0, scale: 0.9, x: -8 }}
						transition={{
							duration: 0.2,
							ease: [0.25, 0.46, 0.45, 0.94],
						}}
					>
						{/* Tooltip on hover — same bg as cards; left-aligned (justify-start) to stay visible inside container. */}
						<div
							aria-hidden
							className="stat-card-bg pointer-events-none absolute top-full left-0 z-50 mt-2 whitespace-nowrap rounded-lg border border-border bg-background px-3 py-2 opacity-0 shadow-lg transition-opacity duration-150 ease-out group-hover/button:opacity-100"
						>
							<span className="stat-card-text font-medium text-foreground text-sm">
								Vedi tutta l&apos;Italia
							</span>
						</div>
						<Button
							aria-label="Vedi tutta l'Italia"
							className="stat-card-bg size-9 rounded-lg border border-border bg-background shadow-sm hover:bg-background"
							onClick={handleResetView}
							size="icon"
							variant="secondary"
						>
							<IconUTurnToLeft size={16} />
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
			{/* Absolute inset forces map/canvas to fill the container — Mapbox GL requires explicit dimensions.
			    Transition for smooth theme/style changes (fog, rain, snow appearance). */}
			<div
				className="absolute inset-0 size-full transition-opacity duration-200 ease-out"
				data-theme-variant={themeVariant}
			>
				<MapboxMap
					initialViewState={{
						longitude: ITALY_CENTER.longitude,
						latitude: ITALY_CENTER.latitude,
						zoom: ITALY_CENTER.zoom,
					}}
					mapboxAccessToken={accessToken}
					mapStyle={mapStyle}
					onLoad={handleMapLoad}
					onMoveEnd={handleMoveEnd}
					projection="globe"
					style={{ width: "100%", height: "100%" }}
				>
					{!isMapLoading &&
						sortedClusters.map((cluster) => {
							const [longitude, latitude] = cluster.geometry.coordinates;
							const props = cluster.properties as
								| (NegotiationPointProperties & { cluster?: boolean })
								| (ClusterProperties & {
										cluster: boolean;
										point_count: number;
								  });

							if ("cluster" in props && props.cluster) {
								const count = (props as { point_count: number }).point_count;
								return (
									<Marker
										anchor="center"
										key={`cluster-${cluster.id}`}
										latitude={latitude}
										longitude={longitude}
										onClick={() => {
											const expZoom = supercluster?.getClusterExpansionZoom(
												(props as { cluster_id: number }).cluster_id
											);
											const map = mapInstanceRef.current;
											if (expZoom != null && map?.flyTo) {
												map.flyTo({
													center: [longitude, latitude],
													zoom: expZoom,
													pitch: 75, // Tilt camera to reveal 3D terrain
												});
												setShowResetButton(true);
											}
										}}
									>
										{/* Cluster: tooltip on hover, elevated circle with primary bg.
										    Hover handlers reorder markers so tooltip appears above others. */}
										{/* biome-ignore lint/a11y/noStaticElementInteractions: Map marker needs hover for tooltip+reorder; info also in title. */}
										{/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Map marker needs hover for tooltip+reorder; info also in title. */}
										<div
											className="group relative flex size-11 cursor-pointer select-none items-center justify-center rounded-full border-2 border-white/95 bg-primary font-semibold text-primary-foreground text-sm tabular-nums shadow-black/25 shadow-lg transition-all duration-150 ease-out hover:scale-105 hover:shadow-black/30 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-white/80 dark:shadow-black/40 dark:hover:shadow-black/50"
											onMouseEnter={(e) => {
												const id =
													cluster.id ??
													(props as { cluster_id: number }).cluster_id;
												handleMarkerMouseEnter(e, id);
											}}
											onMouseLeave={() => setHoveredClusterId(null)}
											title={`${count} ${count === 1 ? "trattativa" : "trattative"} · Clicca per espandere`}
										>
											{/* Tooltip: above when space available, below when near top edge (avoids clipping). */}
											<div
												aria-hidden
												className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 opacity-0 shadow-lg transition-opacity duration-150 ease-out group-hover:opacity-100 ${
													tooltipPlacement === "above"
														? "bottom-full mb-2"
														: "top-full mt-2"
												}`}
											>
												<span className="font-medium text-card-foreground text-sm">
													{count} {count === 1 ? "trattativa" : "trattative"}
												</span>
												<p className="text-muted-foreground text-xs">
													Clicca per espandere
												</p>
											</div>
											{count}
										</div>
									</Marker>
								);
							}

							const negProps = props as unknown as NegotiationPointProperties;
							const color = SPANCO_MARKER_COLORS[negProps?.spanco ?? "S"];
							const markerSizePx = singleMarkerSizePx(zoom);
							const clientLabel =
								negProps?.clientName ?? `Cliente #${negProps?.negotiationId}`;
							const avatarSeed =
								negProps?.clientName ?? negProps?.referente ?? clientLabel;

							return (
								<Marker
									anchor="center"
									key={`point-${negProps?.negotiationId ?? cluster.id}`}
									latitude={latitude}
									longitude={longitude}
									onClick={() => {
										// When zoomed in (>=17), navigate to negotiation detail; otherwise zoom in on location
										if (zoom >= 17) {
											const stato = getNegotiationStatoSegment({
												id: negProps.negotiationId,
												spanco: negProps.spanco,
												abbandonata: negProps.abbandonata,
												percentuale: negProps.percentuale,
											} as ApiNegotiation);
											router.push(
												`/trattative/${stato}/${negProps.negotiationId}`
											);
											return;
										}
										const map = mapInstanceRef.current;
										if (map?.flyTo) {
											map.flyTo({
												center: [longitude, latitude],
												zoom: 17,
												pitch: 75, // Tilt camera to reveal 3D terrain
											});
											setShowResetButton(true);
										}
									}}
								>
									{/* Single point: tooltip on hover with Avatar and client info; click to zoom in on location.
									    Hover handlers reorder markers so tooltip appears above others. */}
									{/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Map marker needs hover for tooltip+reorder; info also in aria-label. */}
									<div
										aria-label={`${clientLabel}${negProps?.referente ? `, referente ${negProps.referente}` : ""}. ${zoom < 17 ? "Clicca per vedere la posizione" : "Clicca per vedere trattativa"}`}
										className="group relative cursor-pointer"
										onMouseEnter={(e) => {
											const id =
												cluster.id ??
												negProps?.negotiationId ??
												cluster.id ??
												0;
											handleMarkerMouseEnter(e, id);
										}}
										onMouseLeave={() => setHoveredClusterId(null)}
										role="img"
									>
										{/* Tooltip: above when space available, below when near top edge (avoids clipping). */}
										<div
											aria-hidden
											className={`pointer-events-none absolute left-1/2 z-50 w-52 -translate-x-1/2 rounded-xl border border-border bg-card px-3 py-2.5 opacity-0 shadow-lg transition-opacity duration-150 ease-out group-hover:opacity-100 ${
												tooltipPlacement === "above"
													? "bottom-full mb-2"
													: "top-full mt-2"
											}`}
										>
											<div className="mb-2 flex h-fit gap-3">
												<Avatar className="size-10 shrink-0 rounded-lg">
													<AvatarFallback
														className="rounded-lg bg-primary/10 text-primary"
														placeholderSeed={avatarSeed}
													/>
												</Avatar>
												<div className="min-w-0 flex-1">
													<p className="truncate font-semibold text-card-foreground text-sm">
														{clientLabel}
													</p>
													{negProps?.referente && (
														<p className="truncate text-muted-foreground text-xs">
															{negProps.referente}
														</p>
													)}
													{negProps?.citta && (
														<p className="truncate text-muted-foreground text-xs">
															{negProps.citta}
														</p>
													)}
													{typeof negProps?.importo === "number" && (
														<p className="mt-0.5 font-medium text-card-foreground text-xs tabular-nums">
															{formatImporto(negProps.importo)}
														</p>
													)}
												</div>
											</div>
											<div className="flex w-full items-center justify-start gap-2.5 rounded-md bg-primary/10 px-2 py-1.5 leading-none">
												{zoom < 17 ? (
													<IconCircleInfoSparkle
														className="shrink-0 text-primary"
														size={20}
													/>
												) : (
													<IconExternalLink
														className="shrink-0 text-primary"
														size={20}
													/>
												)}
												<p className="text-balance text-muted-foreground text-xs">
													{zoom < 17
														? "Clicca per andare alla posizione"
														: "Clicca per vedere la trattativa"}
												</p>
											</div>
										</div>
										{/* Marker dot */}
										<div
											className="rounded-full border-2 border-white/95 transition-shadow duration-150 dark:border-white/85"
											style={{
												width: markerSizePx,
												height: markerSizePx,
												backgroundColor: color,
												boxShadow:
													"0 2px 4px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.6)",
											}}
										/>
									</div>
								</Marker>
							);
						})}
				</MapboxMap>
			</div>
		</div>
	);
}

/**
 * Map of Italy showing negotiations as clustered markers.
 * Uses /api/negotiations/me/with-coordinates for data.
 * Requires NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in environment.
 */
export function NegotiationsMap(): ReactNode {
	const mapboxToken =
		typeof process !== "undefined"
			? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
			: null;

	if (!mapboxToken) {
		return (
			<div className="flex h-[360px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-muted border-dashed bg-muted/20 p-4 text-center sm:h-[440px] md:h-[520px]">
				<p className="text-muted-foreground text-sm">
					Configura{" "}
					<code className="rounded bg-muted px-1 text-xs">
						NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
					</code>{" "}
					per visualizzare la mappa.
				</p>
			</div>
		);
	}

	return <NegotiationsMapInner accessToken={mapboxToken} />;
}

/** Skeleton for the map section while loading. Same heights as map/donut for layout consistency. */
export function NegotiationsMapSkeleton(): ReactNode {
	return (
		<div className="h-[360px] w-full overflow-hidden rounded-xl border border-border sm:h-[440px] md:h-[520px]">
			<Skeleton className="h-full w-full" />
		</div>
	);
}
