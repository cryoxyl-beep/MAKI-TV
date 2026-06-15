import { Link } from "react-router-dom";
import { TMDBMovie, TMDB_IMAGE_BASE_URL_W500 } from "../../services/tmdb";
import { Play } from "lucide-react";
import LazyImage from "../LazyImage";
import React from 'react';

interface MovieCardProps {
  movie: TMDBMovie;
  key?: React.Key;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const posterUrl = movie.poster_path ? `${TMDB_IMAGE_BASE_URL_W500}${movie.poster_path}` : null;
  const releaseYear = movie.release_date ? movie.release_date.substring(0, 4) : '';

  return (
    <Link to={`/movies/movie/${movie.id}`}>
      <div className="group relative flex flex-col gap-2 cursor-pointer w-full w-[160px] md:w-[200px] shrink-0">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-white/[0.02] border border-white/5 transition-all duration-300 group-hover:border-white/20 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          {posterUrl ? (
            <LazyImage
              src={posterUrl}
              alt={movie.title}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">No Poster</div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg">
              <Play className="w-5 h-5 ml-1" />
            </div>
          </div>
          
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-bold text-white tracking-wider border border-white/10">
            {movie.vote_average ? movie.vote_average.toFixed(1) : 'NR'}
          </div>
        </div>

        <div className="flex flex-col gap-0.5 px-0.5">
          <h3 className="text-sm font-semibold text-white truncate group-hover:text-rose-400 transition-colors">
            {movie.title}
          </h3>
          <span className="text-xs text-white/50">{releaseYear}</span>
        </div>
      </div>
    </Link>
  );
}
